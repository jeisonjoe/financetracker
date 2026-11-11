import { ICategoryRepository } from "../interfaces/BaseRepository.js";
import { SupabaseServerClient } from "../../db/SupabaseServerClient.js";
import { CategoryEntity } from "../../domain/entities.js";
import { AppError, NotFoundError } from "../../domain/errors.js";

/**
 * Supabase implementation of ICategoryRepository.
 */
export class SupabaseCategoryRepository extends ICategoryRepository {
  async findAllForUser(userId) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("name", { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return (data || []).map((row) => new CategoryEntity(row));
  }

  async create(userId, { name, type = "expense", icon = null, monthlyBudget = 0 }) {
    const supabase = await SupabaseServerClient.create();
    const fullPayload = {
      user_id: userId,
      name: name.trim(),
      type,
      ...(icon ? { icon } : {}),
      ...(monthlyBudget ? { monthly_budget: Math.round(Number(monthlyBudget)) } : {}),
    };

    let { data, error } = await supabase
      .from("categories")
      .insert(fullPayload)
      .select()
      .single();

    // Fallback if optional columns (icon / monthly_budget) do not exist in Supabase table yet
    if (error && error.message?.includes("column")) {
      const fallbackResult = await supabase
        .from("categories")
        .insert({ user_id: userId, name: name.trim(), type })
        .select()
        .single();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) throw new AppError(error.message, 500);
    return new CategoryEntity(data);
  }

  async update(id, userId, { name, type, icon, monthlyBudget }) {
    const supabase = await SupabaseServerClient.create();
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (type !== undefined) patch.type = type;
    if (icon !== undefined) patch.icon = icon;
    if (monthlyBudget !== undefined) patch.monthly_budget = Math.round(Number(monthlyBudget) || 0);

    const { data, error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", id)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .select();

    if (error) throw new AppError(error.message, 500);
    if (!data || data.length === 0) throw new NotFoundError("Category not found");
    return new CategoryEntity(data[0]);
  }

  async delete(id, userId) {
    const supabase = await SupabaseServerClient.create();
    const { error } = await supabase
      .from("categories")
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
      type: d.type || "expense",
    }));
    const { error } = await supabase.from("categories").insert(rows);
    if (error) throw new AppError(error.message, 500);

    return this.findAllForUser(userId);
  }
}

