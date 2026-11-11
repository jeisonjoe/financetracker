import { IRecurringItemRepository } from "../interfaces/BaseRepository.js";
import { MySqlClient } from "../../db/MySqlClient.js";
import { MySqlSchema } from "../../db/MySqlSchema.js";
import { RecurringItemEntity } from "../../domain/entities.js";
import { NotFoundError } from "../../domain/errors.js";

/**
 * MySQL implementation of IRecurringItemRepository.
 */
export class MySqlRecurringItemRepository extends IRecurringItemRepository {
  async findAllForUser(userId) {
    await MySqlSchema.ensure();
    const rows = await MySqlClient.query(
      `SELECT id, user_id, title, type, amount, frequency, next_due_date,
              category, wallet, is_active, auto_reserve, notes, created_at, updated_at
       FROM recurring_items
       WHERE user_id = ?
       ORDER BY is_active DESC, next_due_date ASC`,
      [userId]
    );
    return rows.map((row) => new RecurringItemEntity(row));
  }

  async findById(id, userId) {
    await MySqlSchema.ensure();
    const rows = await MySqlClient.query(
      `SELECT id, user_id, title, type, amount, frequency, next_due_date,
              category, wallet, is_active, auto_reserve, notes, created_at, updated_at
       FROM recurring_items
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId]
    );
    return rows.length ? new RecurringItemEntity(rows[0]) : null;
  }

  async create(userId, payload) {
    await MySqlSchema.ensure();
    const result = await MySqlClient.execute(
      `INSERT INTO recurring_items
       (user_id, title, type, amount, frequency, next_due_date, category, wallet, is_active, auto_reserve, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        payload.title,
        payload.type,
        payload.amount,
        payload.frequency,
        payload.nextDueDate,
        payload.category,
        payload.wallet,
        payload.isActive ? 1 : 0,
        payload.autoReserve ? 1 : 0,
        payload.notes || "",
      ]
    );
    return this.findById(result.insertId, userId);
  }

  async update(id, userId, payload) {
    await MySqlSchema.ensure();
    const fields = [];
    const params = [];
    const mapping = {
      title: "title",
      type: "type",
      amount: "amount",
      frequency: "frequency",
      nextDueDate: "next_due_date",
      category: "category",
      wallet: "wallet",
      notes: "notes",
    };

    for (const [key, col] of Object.entries(mapping)) {
      if (payload[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push(payload[key]);
      }
    }
    if (payload.isActive !== undefined) {
      fields.push("is_active = ?");
      params.push(payload.isActive ? 1 : 0);
    }
    if (payload.autoReserve !== undefined) {
      fields.push("auto_reserve = ?");
      params.push(payload.autoReserve ? 1 : 0);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id, userId);
      if (!existing) throw new NotFoundError("Recurring item not found");
      return existing;
    }

    params.push(id, userId);
    const result = await MySqlClient.execute(
      `UPDATE recurring_items SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Recurring item not found");
    }
    return this.findById(id, userId);
  }

  async delete(id, userId) {
    await MySqlSchema.ensure();
    const result = await MySqlClient.execute(
      "DELETE FROM recurring_items WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Recurring item not found");
    }
    return true;
  }
}

