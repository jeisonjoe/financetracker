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
      `SELECT id, user_id, parent_id, name, type, icon, monthly_budget, created_at
       FROM categories
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY parent_id ASC, name ASC`,
      [userId]
    );
    return rows.map((row) => new CategoryEntity(row));
  }

  async create(userId, { name, parentId = null, type = "expense", icon = null, monthlyBudget = 0 }) {
    const iconJson = icon ? JSON.stringify(icon) : null;
    const cleanParentId = parentId ? String(parentId) : null;
    const result = await MySqlClient.execute(
      "INSERT INTO categories (user_id, parent_id, name, type, icon, monthly_budget) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, cleanParentId, name.trim(), type, iconJson, Math.round(Number(monthlyBudget) || 0)]
    );

    const rows = await MySqlClient.query(
      "SELECT id, user_id, parent_id, name, type, icon, monthly_budget, created_at FROM categories WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    return new CategoryEntity(rows[0]);
  }

  async update(id, userId, { name, parentId, type, icon, monthlyBudget }) {
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(String(name).trim());
    }
    if (parentId !== undefined) {
      updates.push("parent_id = ?");
      params.push(parentId ? String(parentId) : null);
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
        "SELECT id, user_id, parent_id, name, type, icon, monthly_budget, created_at FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1",
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
      "SELECT id, user_id, parent_id, name, type, icon, monthly_budget, created_at FROM categories WHERE id = ? LIMIT 1",
      [id]
    );
    return new CategoryEntity(rows[0]);
  }

  async delete(id, userId) {
    // Delete any subcategories under this category first
    await MySqlClient.execute(
      "DELETE FROM categories WHERE parent_id = ? AND (user_id = ? OR user_id IS NULL)",
      [id, userId]
    );
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
    if (existing.length === 0) {
      for (const item of defaults) {
        const iconJson = item.icon ? JSON.stringify(item.icon) : null;
        const result = await MySqlClient.execute(
          "INSERT INTO categories (user_id, parent_id, name, type, icon, monthly_budget) VALUES (?, NULL, ?, ?, ?, ?)",
          [
            userId,
            item.name,
            item.type || "expense",
            iconJson,
            Math.round(Number(item.monthlyBudget) || 0),
          ]
        );
        const parentId = result.insertId;
        if (Array.isArray(item.subcategories)) {
          for (const sub of item.subcategories) {
            const subName = typeof sub === "string" ? sub : sub.name;
            const subBudget = typeof sub === "object" ? sub.monthlyBudget || 0 : 0;
            await MySqlClient.execute(
              "INSERT INTO categories (user_id, parent_id, name, type, icon, monthly_budget) VALUES (?, ?, ?, ?, ?, ?)",
              [
                userId,
                parentId,
                subName,
                item.type || "expense",
                iconJson,
                Math.round(Number(subBudget) || 0),
              ]
            );
          }
        }
      }
      return this.findAllForUser(userId);
    }

    // Backfill subcategories for users whose existing categories do not have any subcategories yet
    const hasAnySubcategories = existing.some((c) => Boolean(c.parentId));
    if (!hasAnySubcategories) {
      const parentMap = new Map(existing.map((c) => [c.name.toLowerCase().trim(), c]));
      for (const item of defaults) {
        const parent = parentMap.get(item.name.toLowerCase().trim());
        if (parent && Array.isArray(item.subcategories)) {
          const parentIconJson = parent.icon ? JSON.stringify(parent.icon) : null;
          for (const sub of item.subcategories) {
            const subName = typeof sub === "string" ? sub : sub.name;
            const subBudget = typeof sub === "object" ? sub.monthlyBudget || 0 : 0;
            await MySqlClient.execute(
              "INSERT INTO categories (user_id, parent_id, name, type, icon, monthly_budget) VALUES (?, ?, ?, ?, ?, ?)",
              [
                userId,
                parent.id,
                subName,
                parent.type || "expense",
                parentIconJson,
                Math.round(Number(subBudget) || 0),
              ]
            );
          }
        }
      }
      return this.findAllForUser(userId);
    }

    return existing;
  }
}

