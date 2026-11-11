import { IRecurringItemRepository } from "../interfaces/BaseRepository.js";
import { SupabaseServerClient } from "../../db/SupabaseServerClient.js";
import { RecurringItemEntity } from "../../domain/entities.js";
import { AppError, NotFoundError } from "../../domain/errors.js";

/**
 * Supabase implementation of IRecurringItemRepository.
 */
export class SupabaseRecurringItemRepository extends IRecurringItemRepository {
  async findAllForUser(userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("recurring_items")
      .select("*")
      .eq("user_id", userId)
      .order("next_due_date", { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return (data || []).map((row) => new RecurringItemEntity(row));
  }

  async findById(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("recurring_items")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 500);
    return data ? new RecurringItemEntity(data) : null;
  }

  async create(userId, payload) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("recurring_items")
      .insert({
        user_id: userId,
        title: payload.title,
        type: payload.type,
        amount: payload.amount,
        frequency: payload.frequency,
        next_due_date: payload.nextDueDate,
        category: payload.category,
        wallet: payload.wallet,
        is_active: Boolean(payload.isActive),
        auto_reserve: Boolean(payload.autoReserve),
        notes: payload.notes || "",
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return new RecurringItemEntity(data);
  }

  async update(id, userId, payload) {
    const supabase = await SupabaseServerClient.create();
    const patch = {};
    const mapping = {
      title: "title",
      type: "type",
      amount: "amount",
      frequency: "frequency",
      nextDueDate: "next_due_date",
      category: "category",
      wallet: "wallet",
      isActive: "is_active",
      autoReserve: "auto_reserve",
      notes: "notes",
    };

    for (const [key, col] of Object.entries(mapping)) {
      if (payload[key] !== undefined) patch[col] = payload[key];
    }
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("recurring_items")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw new AppError(error.message, 500);
    if (!data || data.length === 0) throw new NotFoundError("Recurring item not found");
    return new RecurringItemEntity(data[0]);
  }

  async delete(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { error } = await supabase
      .from("recurring_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new AppError(error.message, 500);
    return true;
  }
}

