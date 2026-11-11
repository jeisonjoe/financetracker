import { ICategoryRepository } from "../interfaces/BaseRepository.js";
import { MySqlClient } from "../../db/MySqlClient.js";
import { CategoryEntity } from "../../domain/entities.js";
import { NotFoundError } from "../../domain/errors.js";

/**
 * MySQL implementation of ICategoryRepository.
 */
export class MySqlCategoryRepository extends ICategoryRepository {
  async findAllForUser(userId) {
    const rows = await MySqlClient.query(
      `SELECT id, user_id, name, type, icon, monthly_budget, created_at
       FROM categories
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY name ASC`,
      [userId]
    );
    return rows.map((row) => new CategoryEntity(row));
  }

  async create(userId, { name, type = "expense", icon = null, monthlyBudget = 0 }) {
    const iconJson = icon ? JSON.stringify(icon) : null;
    const result = await MySqlClient.execute(
      "INSERT INTO categories (user_id, name, type, icon, monthly_budget) VALUES (?, ?, ?, ?, ?)",
      [userId, name.trim(), type, iconJson, Math.round(Number(monthlyBudget) || 0)]
    );

    const rows = await MySqlClient.query(
      "SELECT id, user_id, name, type, icon, monthly_budget, created_at FROM categories WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    return new CategoryEntity(rows[0]);
  }

  async update(id, userId, { name, type, icon, monthlyBudget }) {
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(String(name).trim());
    }
    if (type !== undefined) {
      updates.push("type = ?");
      params.push(type);
    }
    if (icon !== undefined) {
      updates.push("icon = ?");
      params.push(icon ? JSON.stringify(icon) : null);
    }
    if (monthlyBudget !== undefined) {
      updates.push("monthly_budget = ?");
      params.push(Math.round(Number(monthlyBudget) || 0));
    }

    if (updates.length === 0) {
      const existing = await MySqlClient.query(
        "SELECT id, user_id, name, type, icon, monthly_budget, created_at FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1",
        [id, userId]
      );
      if (!existing.length) throw new NotFoundError("Category not found");
      return new CategoryEntity(existing[0]);
    }

    params.push(id, userId);
    const result = await MySqlClient.execute(
      `UPDATE categories SET ${updates.join(", ")} WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      params
    );

    if (result.affectedRows === 0) {
      throw new NotFoundError("Category not found");
    }

    const rows = await MySqlClient.query(
      "SELECT id, user_id, name, type, icon, monthly_budget, created_at FROM categories WHERE id = ? LIMIT 1",
      [id]
    );
    return new CategoryEntity(rows[0]);
  }

  async delete(id, userId) {
    const result = await MySqlClient.execute(
      "DELETE FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Category not found");
    }
    return true;
  }

  async seedDefaultsIfEmpty(userId, defaults) {
    const existing = await this.findAllForUser(userId);
    if (existing.length > 0) return existing;

    for (const item of defaults) {
      await MySqlClient.execute(
        "INSERT INTO categories (user_id, name, type, icon, monthly_budget) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          item.name,
          item.type || "expense",
          item.icon ? JSON.stringify(item.icon) : null,
          Math.round(Number(item.monthlyBudget) || 0),
        ]
      );
    }

    return this.findAllForUser(userId);
  }
}

