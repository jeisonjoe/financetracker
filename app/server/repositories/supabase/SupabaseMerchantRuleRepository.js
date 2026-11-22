import { IMerchantRuleRepository } from "../interfaces/BaseRepository.js";
import { SupabaseServerClient } from "../../db/SupabaseServerClient.js";
import { MerchantRuleEntity } from "../../domain/entities.js";
import { AppError, NotFoundError } from "../../domain/errors.js";

/**
 * Supabase implementation of IMerchantRuleRepository.
 */
export class SupabaseMerchantRuleRepository extends IMerchantRuleRepository {
  async findAllForUser(userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("merchant_rules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // If table doesn't exist yet in Supabase instance, return empty list gracefully
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return [];
      }
      throw new AppError(error.message, 500);
    }
    return (data || []).map((row) => new MerchantRuleEntity(row));
  }

  async create(userId, { pattern, category, subcategory = null, payee = null, defaultNote = null, tags = [], isActive = true }) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("merchant_rules")
      .insert({
        user_id: userId,
        pattern: String(pattern).trim(),
        category: String(category).trim(),
        subcategory: subcategory ? String(subcategory).trim() : null,
        payee: payee ? String(payee).trim() : null,
        default_note: defaultNote ? String(defaultNote).trim() : null,
        tags: Array.isArray(tags) ? tags : [],
        is_active: Boolean(isActive),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return new MerchantRuleEntity(data);
  }

  async update(id, userId, patch) {
    const supabase = await SupabaseServerClient.create();
    const row = {};
    if (patch.pattern !== undefined) row.pattern = String(patch.pattern).trim();
    if (patch.category !== undefined) row.category = String(patch.category).trim();
    if (patch.subcategory !== undefined) row.subcategory = patch.subcategory ? String(patch.subcategory).trim() : null;
    if (patch.payee !== undefined) row.payee = patch.payee ? String(patch.payee).trim() : null;
    if (patch.defaultNote !== undefined || patch.default_note !== undefined) {
      row.default_note = patch.defaultNote ?? patch.default_note;
    }
    if (patch.tags !== undefined) row.tags = Array.isArray(patch.tags) ? patch.tags : [];
    if (patch.isActive !== undefined || patch.is_active !== undefined) {
      row.is_active = Boolean(patch.isActive ?? patch.is_active);
    }

    const { data, error } = await supabase
      .from("merchant_rules")
      .update(row)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    if (!data) throw new NotFoundError("Rule not found");
    return new MerchantRuleEntity(data);
  }

  async delete(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { error, count } = await supabase
      .from("merchant_rules")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new AppError(error.message, 500);
    return true;
  }
}
