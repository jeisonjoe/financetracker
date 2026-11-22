import { IMerchantRuleRepository } from "../interfaces/BaseRepository.js";
import { MySqlClient } from "../../db/MySqlClient.js";
import { MySqlSchema } from "../../db/MySqlSchema.js";
import { MerchantRuleEntity } from "../../domain/entities.js";
import { NotFoundError } from "../../domain/errors.js";

/**
 * MySQL implementation of IMerchantRuleRepository.
 */
export class MySqlMerchantRuleRepository extends IMerchantRuleRepository {
  async findAllForUser(userId) {
    await MySqlSchema.ensure();
    const rows = await MySqlClient.query(
      `SELECT id, user_id, pattern, category, subcategory, payee, default_note, tags, is_active, created_at
       FROM merchant_rules
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId]
    );
    return rows.map((row) => new MerchantRuleEntity(row));
  }

  async create(userId, { pattern, category, subcategory = null, payee = null, defaultNote = null, tags = [], isActive = true }) {
    await MySqlSchema.ensure();
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : null;
    const result = await MySqlClient.execute(
      `INSERT INTO merchant_rules (user_id, pattern, category, subcategory, payee, default_note, tags, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        String(pattern).trim(),
        String(category).trim(),
        subcategory ? String(subcategory).trim() : null,
        payee ? String(payee).trim() : null,
        defaultNote ? String(defaultNote).trim() : null,
        tagsJson,
        isActive ? 1 : 0,
      ]
    );

    const rows = await MySqlClient.query(
      "SELECT id, user_id, pattern, category, subcategory, payee, default_note, tags, is_active, created_at FROM merchant_rules WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    return new MerchantRuleEntity(rows[0]);
  }

  async update(id, userId, patch) {
    await MySqlSchema.ensure();
    const updates = [];
    const params = [];

    if (patch.pattern !== undefined) {
      updates.push("pattern = ?");
      params.push(String(patch.pattern).trim());
    }
    if (patch.category !== undefined) {
      updates.push("category = ?");
      params.push(String(patch.category).trim());
    }
    if (patch.subcategory !== undefined) {
      updates.push("subcategory = ?");
      params.push(patch.subcategory ? String(patch.subcategory).trim() : null);
    }
    if (patch.payee !== undefined) {
      updates.push("payee = ?");
      params.push(patch.payee ? String(patch.payee).trim() : null);
    }
    if (patch.defaultNote !== undefined || patch.default_note !== undefined) {
      const note = patch.defaultNote ?? patch.default_note;
      updates.push("default_note = ?");
      params.push(note ? String(note).trim() : null);
    }
    if (patch.tags !== undefined) {
      updates.push("tags = ?");
      params.push(Array.isArray(patch.tags) ? JSON.stringify(patch.tags) : null);
    }
    if (patch.isActive !== undefined || patch.is_active !== undefined) {
      const active = patch.isActive ?? patch.is_active;
      updates.push("is_active = ?");
      params.push(active ? 1 : 0);
    }

    if (updates.length === 0) {
      const rows = await MySqlClient.query(
        "SELECT id, user_id, pattern, category, subcategory, payee, default_note, tags, is_active, created_at FROM merchant_rules WHERE id = ? AND user_id = ? LIMIT 1",
        [id, userId]
      );
      if (!rows.length) throw new NotFoundError("Rule not found");
      return new MerchantRuleEntity(rows[0]);
    }

    params.push(id, userId);
    const result = await MySqlClient.execute(
      `UPDATE merchant_rules SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Rule not found");
    }

    const rows = await MySqlClient.query(
      "SELECT id, user_id, pattern, category, subcategory, payee, default_note, tags, is_active, created_at FROM merchant_rules WHERE id = ? LIMIT 1",
      [id]
    );
    return new MerchantRuleEntity(rows[0]);
  }

  async delete(id, userId) {
    const result = await MySqlClient.execute(
      "DELETE FROM merchant_rules WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Rule not found");
    }
    return true;
  }
}
