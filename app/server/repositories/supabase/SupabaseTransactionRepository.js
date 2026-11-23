import { ITransactionRepository } from "../interfaces/BaseRepository.js";
import { SupabaseServerClient } from "../../db/SupabaseServerClient.js";
import { TransactionEntity } from "../../domain/entities.js";
import { AppError, NotFoundError } from "../../domain/errors.js";

const VALID_TYPES = new Set(["income", "expense", "transfer"]);

/**
 * Supabase implementation of ITransactionRepository.
 */
export class SupabaseTransactionRepository extends ITransactionRepository {
  async findByUser(userId, { page = 0, pageSize = 20, type = null, search = "", wallet = "", category = "", tag = "", startDate = null, endDate = null } = {}) {
    const supabase = await SupabaseServerClient.create();
    const limit = Math.max(1, Math.min(Number(pageSize) || 20, 500));
    const offset = Math.max(0, Number(page) || 0) * limit;

    let query = supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (VALID_TYPES.has(type)) {
      query = query.eq("type", type);
    }

    if (startDate) {
      const isoStart = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000`;
      query = query.gte("created_at", isoStart);
    }

    if (endDate) {
      const isoEnd = endDate.includes("T") ? endDate : `${endDate}T23:59:59.999`;
      query = query.lte("created_at", isoEnd);
    }

    // Apply JSON filtering in JS when search/wallet/category/tag filters are active
    // so PostgREST JSON path differences never break across Postgres versions.
    const needsClientFilter = Boolean(search?.trim() || wallet?.trim() || category?.trim() || tag?.trim());

    if (!needsClientFilter) {
      query = query.range(offset, offset + limit - 1);
      const { data, error, count } = await query;
      if (error) throw new AppError(error.message, 500);
      const total = Number(count ?? data?.length ?? 0);
      return {
        items: (data || []).map((row) => new TransactionEntity(row)),
        total,
        hasMore: offset + (data?.length || 0) < total,
      };
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    const searchLower = search.trim().toLowerCase();
    const cleanTag = tag.trim().replace(/^#/, "").toLowerCase();
    const filtered = (data || [])
      .map((row) => new TransactionEntity(row))
      .filter((tx) => {
        if (searchLower) {
          const matchNote = tx.note.toLowerCase().includes(searchLower);
          const matchPayee = tx.payee.toLowerCase().includes(searchLower);
          const matchTag = tx.tags?.some((t) => t.toLowerCase().includes(searchLower));
          if (!matchNote && !matchPayee && !matchTag) return false;
        }
        if (cleanTag && !tx.tags?.some((t) => t.toLowerCase() === cleanTag)) return false;
        if (wallet && tx.wallet.name !== wallet && tx.toWallet?.name !== wallet) return false;
        if (category && tx.category.name !== category) return false;
        return true;
      });

    const paged = filtered.slice(offset, offset + limit);
    return {
      items: paged,
      total: filtered.length,
      hasMore: offset + paged.length < filtered.length,
    };
  }

  async findInDateRange(userId, startIso = null, endIso = null, type = null) {
    const supabase = await SupabaseServerClient.create();
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (startIso) query = query.gte("created_at", startIso);
    if (endIso) query = query.lte("created_at", endIso);
    if (VALID_TYPES.has(type)) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    return (data || []).map((row) => new TransactionEntity(row));
  }

  async findById(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 500);
    return data ? new TransactionEntity(data) : null;
  }

  async create(userId, payload) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: VALID_TYPES.has(payload.type) ? payload.type : "expense",
        amount: Math.round(Number(payload.amount) || 0),
        created_at: payload.created_at || new Date().toISOString(),
        transaction: payload.transaction || {},
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return new TransactionEntity(data);
  }

  async update(id, userId, payload) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("transactions")
      .update({
        type: VALID_TYPES.has(payload.type) ? payload.type : "expense",
        amount: Math.round(Number(payload.amount) || 0),
        created_at: payload.created_at || new Date().toISOString(),
        transaction: payload.transaction || {},
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw new AppError(error.message, 500);
    if (!data || data.length === 0) throw new NotFoundError("Transaction not found");
    return new TransactionEntity(data[0]);
  }

  async delete(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new AppError(error.message, 500);
    return true;
  }

  async bulkUpsertByExternalId(userId, items) {
    const supabase = await SupabaseServerClient.create();
    const { data: existing, error } = await supabase
      .from("transactions")
      .select("id, transaction")
      .eq("user_id", userId);

    if (error) throw new AppError(error.message, 500);

    const existingMap = new Map();
    for (const row of existing || []) {
      const extId = row.transaction?.external_id;
      if (extId) existingMap.set(extId, row.id);
    }

    const toCreate = [];
    const toUpdate = [];
    const seenExternalIds = new Map();

    for (const item of items) {
      const extId = item.transaction?.external_id;
      const existingId = extId ? existingMap.get(extId) : null;
      const record = {
        user_id: userId,
        amount: Math.round(Number(item.amount) || 0),
        type: item.type === "income" ? "income" : "expense",
        created_at: item.created_at || new Date().toISOString(),
        transaction: item.transaction || {},
      };

      if (existingId) {
        toUpdate.push({ id: existingId, record });
      } else if (extId && seenExternalIds.has(extId)) {
        toCreate[seenExternalIds.get(extId)] = record;
      } else {
        if (extId) seenExternalIds.set(extId, toCreate.length);
        toCreate.push(record);
      }
    }

    let imported = 0;
    let updated = 0;
    let firstError = null;
    const BATCH_SIZE = 50;

    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const chunk = toCreate.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await supabase.from("transactions").insert(chunk);
      if (insertErr) {
        if (!firstError) firstError = insertErr.message;
      } else {
        imported += chunk.length;
      }
    }

    for (const item of toUpdate) {
      const { error: updateErr } = await supabase
        .from("transactions")
        .update({
          amount: item.record.amount,
          type: item.record.type,
          transaction: item.record.transaction,
        })
        .eq("id", item.id)
        .eq("user_id", userId);

      if (updateErr) {
        if (!firstError) firstError = updateErr.message;
      } else {
        updated += 1;
      }
    }

    return { imported, updated, failed: 0, firstError };
  }
}

