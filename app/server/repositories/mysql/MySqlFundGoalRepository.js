import { IFundGoalRepository } from "../interfaces/BaseRepository.js";
import { MySqlClient } from "../../db/MySqlClient.js";
import { MySqlSchema } from "../../db/MySqlSchema.js";
import { FundGoalEntity } from "../../domain/entities.js";
import { NotFoundError } from "../../domain/errors.js";

/**
 * MySQL implementation of IFundGoalRepository.
 */
export class MySqlFundGoalRepository extends IFundGoalRepository {
  async findAllForUser(userId) {
    await MySqlSchema.ensure();
    const rows = await MySqlClient.query(
      `SELECT id, user_id, name, target_amount, current_amount, monthly_contribution,
              target_date, category, priority, status, notes, created_at, updated_at
       FROM fund_goals
       WHERE user_id = ?
       ORDER BY FIELD(status, 'active', 'paused', 'completed'), created_at DESC`,
      [userId]
    );
    return rows.map((row) => new FundGoalEntity(row));
  }

  async findById(id, userId) {
    await MySqlSchema.ensure();
    const rows = await MySqlClient.query(
      `SELECT id, user_id, name, target_amount, current_amount, monthly_contribution,
              target_date, category, priority, status, notes, created_at, updated_at
       FROM fund_goals
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId]
    );
    return rows.length ? new FundGoalEntity(rows[0]) : null;
  }

  async create(userId, payload) {
    await MySqlSchema.ensure();
    const result = await MySqlClient.execute(
      `INSERT INTO fund_goals
       (user_id, name, target_amount, current_amount, monthly_contribution, target_date, category, priority, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        payload.name,
        payload.targetAmount,
        payload.currentAmount,
        payload.monthlyContribution,
        payload.targetDate || null,
        payload.category || "general",
        payload.priority || "medium",
        payload.status || "active",
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
      if (payload[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push(payload[key]);
      }
    }

    if (fields.length === 0) {
      const existing = await this.findById(id, userId);
      if (!existing) throw new NotFoundError("Goal not found");
      return existing;
    }

    params.push(id, userId);
    const result = await MySqlClient.execute(
      `UPDATE fund_goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Goal not found");
    }
    return this.findById(id, userId);
  }

  async delete(id, userId) {
    await MySqlSchema.ensure();
    const result = await MySqlClient.execute(
      "DELETE FROM fund_goals WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Goal not found");
    }
    return true;
  }
}

