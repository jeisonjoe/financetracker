import { IWalletRepository } from "../interfaces/BaseRepository.js";
import { SupabaseServerClient } from "../../db/SupabaseServerClient.js";
import { WalletEntity } from "../../domain/entities.js";
import { AppError, NotFoundError } from "../../domain/errors.js";

/**
 * Supabase implementation of IWalletRepository.
 */
export class SupabaseWalletRepository extends IWalletRepository {
  async findAllForUser(userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("name", { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return (data || []).map((row) => new WalletEntity(row));
  }

  async create(
    userId,
    {
      name,
      type = "debit",
      openingBalance = 0,
      creditLimit = 0,
      statementDay = null,
      dueDay = null,
    }
  ) {
    const supabase = await SupabaseServerClient.create();
    const balance = Math.round(Number(openingBalance) || 0);
    const limit = Math.max(0, Math.round(Number(creditLimit) || 0));
    let { data, error } = await supabase
      .from("wallets")
      .insert({
        user_id: userId,
        name: name.trim(),
        type,
        ...(balance ? { opening_balance: balance } : {}),
        ...(limit ? { credit_limit: limit } : {}),
        ...(statementDay ? { statement_day: statementDay } : {}),
        ...(dueDay ? { due_day: dueDay } : {}),
      })
      .select()
      .single();

    if (error && error.message?.includes("column")) {
      const fallback = await supabase
        .from("wallets")
        .insert({ user_id: userId, name: name.trim(), type })
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw new AppError(error.message, 500);
    return new WalletEntity(data);
  }

  async update(
    id,
    userId,
    { name, type, openingBalance, creditLimit, statementDay, dueDay }
  ) {
    const supabase = await SupabaseServerClient.create();
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (type !== undefined) patch.type = type;
    if (openingBalance !== undefined) {
      patch.opening_balance = Math.round(Number(openingBalance) || 0);
    }
    if (creditLimit !== undefined) {
      patch.credit_limit = Math.max(0, Math.round(Number(creditLimit) || 0));
    }
    if (statementDay !== undefined) {
      patch.statement_day = statementDay ? Number(statementDay) : null;
    }
    if (dueDay !== undefined) {
      patch.due_day = dueDay ? Number(dueDay) : null;
    }

    const { data, error } = await supabase
      .from("wallets")
      .update(patch)
      .eq("id", id)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .select();

    if (error) throw new AppError(error.message, 500);
    if (!data || data.length === 0) throw new NotFoundError("Wallet not found");
    return new WalletEntity(data[0]);
  }

  async delete(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { error } = await supabase
      .from("wallets")
      .delete()
      .eq("id", id)
      .or(`user_id.eq.${userId},user_id.is.null`);

    if (error) throw new AppError(error.message, 500);
    return true;
  }

  async seedDefaultsIfEmpty(userId, defaults) {
    const existing = await this.findAllForUser(userId);
    if (existing.length > 0) return existing;

    const supabase = await SupabaseServerClient.create();
    const rows = defaults.map((d) => ({
      user_id: userId,
      name: d.name,
      type: d.type || "debit",
    }));
    const { error } = await supabase.from("wallets").insert(rows);
    if (error) throw new AppError(error.message, 500);

    return this.findAllForUser(userId);
  }
}

