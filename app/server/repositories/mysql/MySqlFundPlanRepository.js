import { IFundPlanRepository } from "../interfaces/BaseRepository.js";
import { MySqlClient } from "../../db/MySqlClient.js";
import { MySqlSchema } from "../../db/MySqlSchema.js";
import { FundPlanEntity } from "../../domain/entities.js";

/**
 * MySQL implementation of IFundPlanRepository.
 */
export class MySqlFundPlanRepository extends IFundPlanRepository {
  async findForUser(userId) {
    await MySqlSchema.ensure();
    const rows = await MySqlClient.query(
      `SELECT id, user_id, monthly_income_target, needs_percent, wants_percent,
              savings_percent, reserve_buffer, category_buckets, updated_at
       FROM fund_plans
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );
    return rows.length ? new FundPlanEntity(rows[0]) : new FundPlanEntity({ user_id: userId });
  }

  async upsert(userId, payload) {
    await MySqlSchema.ensure();
    const bucketsJson = JSON.stringify(payload.categoryBuckets || {});
    await MySqlClient.execute(
      `INSERT INTO fund_plans
       (user_id, monthly_income_target, needs_percent, wants_percent, savings_percent, reserve_buffer, category_buckets)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         monthly_income_target = VALUES(monthly_income_target),
         needs_percent = VALUES(needs_percent),
         wants_percent = VALUES(wants_percent),
         savings_percent = VALUES(savings_percent),
         reserve_buffer = VALUES(reserve_buffer),
         category_buckets = VALUES(category_buckets)`,
      [
        userId,
        payload.monthlyIncomeTarget,
        payload.needsPercent,
        payload.wantsPercent,
        payload.savingsPercent,
        payload.reserveBuffer,
        bucketsJson,
      ]
    );
    return this.findForUser(userId);
  }
}

