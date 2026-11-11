import { IFundPlanRepository } from "../interfaces/BaseRepository.js";
import { SupabaseServerClient } from "../../db/SupabaseServerClient.js";
import { FundPlanEntity } from "../../domain/entities.js";
import { AppError } from "../../domain/errors.js";

/**
 * Supabase implementation of IFundPlanRepository.
 */
export class SupabaseFundPlanRepository extends IFundPlanRepository {
  async findForUser(userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("fund_plans")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 500);
    return data ? new FundPlanEntity(data) : new FundPlanEntity({ user_id: userId });
  }

  async upsert(userId, payload) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("fund_plans")
      .upsert(
        {
          user_id: userId,
          monthly_income_target: payload.monthlyIncomeTarget,
          needs_percent: payload.needsPercent,
          wants_percent: payload.wantsPercent,
          savings_percent: payload.savingsPercent,
          reserve_buffer: payload.reserveBuffer,
          category_buckets: payload.categoryBuckets || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return new FundPlanEntity(data);
  }
}

