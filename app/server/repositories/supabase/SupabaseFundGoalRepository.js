import { IFundGoalRepository } from "../interfaces/BaseRepository.js";
import { SupabaseServerClient } from "../../db/SupabaseServerClient.js";
import { FundGoalEntity } from "../../domain/entities.js";
import { AppError, NotFoundError } from "../../domain/errors.js";

/**
 * Supabase implementation of IFundGoalRepository.
 */
export class SupabaseFundGoalRepository extends IFundGoalRepository {
  async findAllForUser(userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("fund_goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 500);
    return (data || []).map((row) => new FundGoalEntity(row));
  }

  async findById(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("fund_goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 500);
    return data ? new FundGoalEntity(data) : null;
  }

  async create(userId, payload) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("fund_goals")
      .insert({
        user_id: userId,
        name: payload.name,
        target_amount: payload.targetAmount,
        current_amount: payload.currentAmount,
        monthly_contribution: payload.monthlyContribution,
        target_date: payload.targetDate || null,
        category: payload.category || "general",
        priority: payload.priority || "medium",
        status: payload.status || "active",
        notes: payload.notes || "",
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return new FundGoalEntity(data);
  }

  async update(id, userId, payload) {
    const supabase = await SupabaseServerClient.create();
    const patch = {};
    const mapping = {
      name: "name",
      targetAmount: "target_amount",
      currentAmount: "current_amount",
      monthlyContribution: "monthly_contribution",
      targetDate: "target_date",
      category: "category",
      priority: "priority",
      status: "status",
      notes: "notes",
    };

    for (const [key, col] of Object.entries(mapping)) {
      if (payload[key] !== undefined) patch[col] = payload[key];
    }
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("fund_goals")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw new AppError(error.message, 500);
    if (!data || data.length === 0) throw new NotFoundError("Goal not found");
    return new FundGoalEntity(data[0]);
  }

  async delete(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { error } = await supabase
      .from("fund_goals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new AppError(error.message, 500);
    return true;
  }
}

