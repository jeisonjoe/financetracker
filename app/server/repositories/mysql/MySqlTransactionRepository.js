import { ITransactionRepository } from "../interfaces/BaseRepository.js";
import { MySqlClient } from "../../db/MySqlClient.js";
import { MySqlSchema } from "../../db/MySqlSchema.js";
import { TransactionEntity, parseJsonColumn } from "../../domain/entities.js";
import { NotFoundError } from "../../domain/errors.js";

const VALID_TYPES = new Set(["income", "expense", "transfer"]);

/**
 * MySQL implementation of ITransactionRepository.
 */
export class MySqlTransactionRepository extends ITransactionRepository {
  async findByUser(userId, { page = 0, pageSize = 20, type = null, search = "", wallet = "", category = "" } = {}) {
    await MySqlSchema.ensure();
    const conditions = ["user_id = ?"];
    const params = [userId];

    if (VALID_TYPES.has(type)) {
      conditions.push("type = ?");
      params.push(type);
    }

    if (search && search.trim()) {
      const like = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        "(LOWER(JSON_UNQUOTE(JSON_EXTRACT(transaction, '$.note'))) LIKE ? OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(transaction, '$.payee'))) LIKE ?)"
      );
      params.push(like, like);
    }

    if (wallet && wallet.trim()) {
      conditions.push(
        "(JSON_UNQUOTE(JSON_EXTRACT(transaction, '$.wallet.name')) = ? OR JSON_UNQUOTE(JSON_EXTRACT(transaction, '$.wallet')) = ? OR JSON_UNQUOTE(JSON_EXTRACT(transaction, '$.to_wallet.name')) = ? OR JSON_UNQUOTE(JSON_EXTRACT(transaction, '$.to_wallet')) = ?)"
      );
      params.push(wallet.trim(), wallet.trim(), wallet.trim(), wallet.trim());
    }

    if (category && category.trim()) {
      conditions.push(
        "(JSON_UNQUOTE(JSON_EXTRACT(transaction, '$.category.name')) = ? OR JSON_UNQUOTE(JSON_EXTRACT(transaction, '$.category')) = ?)"
      );
      params.push(category.trim(), category.trim());
    }

    const whereClause = conditions.join(" AND ");
    const limit = Math.max(1, Math.min(Number(pageSize) || 20, 500));
    const offset = Math.max(0, Number(page) || 0) * limit;

    const rows = await MySqlClient.query(
      `SELECT id, user_id, type, amount, transaction, created_at
       FROM transactions
       WHERE ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRows = await MySqlClient.query(
      `SELECT COUNT(*) AS total FROM transactions WHERE ${whereClause}`,
      params
    );

    const total = Number(countRows[0]?.total || 0);
    return {
      items: rows.map((row) => new TransactionEntity(row)),
      total,
      hasMore: offset + rows.length < total,
    };
  }

  async findInDateRange(userId, startIso = null, endIso = null, type = null) {
    await MySqlSchema.ensure();
    const conditions = ["user_id = ?"];
    const params = [userId];

    if (startIso) {
      conditions.push("created_at >= ?");
      params.push(MySqlClient.toMysqlDateTime(startIso));
    }
    if (endIso) {
      conditions.push("created_at <= ?");
      params.push(MySqlClient.toMysqlDateTime(endIso));
    }
    if (VALID_TYPES.has(type)) {
      conditions.push("type = ?");
      params.push(type);
    }

    const rows = await MySqlClient.query(
      `SELECT id, user_id, type, amount, transaction, created_at
       FROM transactions
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC`,
      params
    );

    return rows.map((row) => new TransactionEntity(row));
  }

  async findById(id, userId) {
    await MySqlSchema.ensure();
    const rows = await MySqlClient.query(
      "SELECT id, user_id, type, amount, transaction, created_at FROM transactions WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    );
    return rows.length ? new TransactionEntity(rows[0]) : null;
  }

  async create(userId, payload) {
    await MySqlSchema.ensure();
    const createdAt = MySqlClient.toMysqlDateTime(payload.created_at);
    const amount = Math.round(Number(payload.amount) || 0);
    const type = VALID_TYPES.has(payload.type) ? payload.type : "expense";
    const jsonPayload = JSON.stringify(payload.transaction || {});

    const result = await MySqlClient.execute(
      "INSERT INTO transactions (user_id, type, amount, transaction, created_at) VALUES (?, ?, ?, ?, ?)",
      [userId, type, amount, jsonPayload, createdAt]
    );

    return this.findById(result.insertId, userId);
  }

  async update(id, userId, payload) {
    await MySqlSchema.ensure();
    const createdAt = MySqlClient.toMysqlDateTime(payload.created_at);
    const amount = Math.round(Number(payload.amount) || 0);
    const type = VALID_TYPES.has(payload.type) ? payload.type : "expense";
    const jsonPayload = JSON.stringify(payload.transaction || {});

    const result = await MySqlClient.execute(
      "UPDATE transactions SET type = ?, amount = ?, transaction = ?, created_at = ? WHERE id = ? AND user_id = ?",
      [type, amount, jsonPayload, createdAt, id, userId]
    );

    if (result.affectedRows === 0) {
      throw new NotFoundError("Transaction not found");
    }

    return this.findById(id, userId);
  }

  async delete(id, userId) {
    const result = await MySqlClient.execute(
      "DELETE FROM transactions WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Transaction not found");
    }
    return true;
  }

  async bulkUpsertByExternalId(userId, items) {
    const existingRows = await MySqlClient.query(
      "SELECT id, transaction FROM transactions WHERE user_id = ?",
      [userId]
    );

    const existingMap = new Map();
    for (const row of existingRows) {
      const meta = parseJsonColumn(row.transaction, {});
      if (meta.external_id) {
        existingMap.set(meta.external_id, row.id);
      }
    }

    let imported = 0;
    let updated = 0;
    let firstError = null;

    await MySqlClient.withTransaction(async (connection) => {
      for (const item of items) {
        try {
          const extId = item.transaction?.external_id;
          const existingId = extId ? existingMap.get(extId) : null;
          const amount = Math.round(Number(item.amount) || 0);
          const type = item.type === "income" ? "income" : "expense";
          const createdAt = MySqlClient.toMysqlDateTime(item.created_at);
          const jsonStr = JSON.stringify(item.transaction || {});

          if (existingId) {
            await connection.execute(
              "UPDATE transactions SET amount = ?, type = ?, transaction = ? WHERE id = ? AND user_id = ?",
              [amount, type, jsonStr, existingId, userId]
            );
            updated += 1;
          } else {
            const [insertResult] = await connection.execute(
              "INSERT INTO transactions (user_id, type, amount, transaction, created_at) VALUES (?, ?, ?, ?, ?)",
              [userId, type, amount, jsonStr, createdAt]
            );
            if (extId) {
              existingMap.set(extId, insertResult.insertId);
            }
            imported += 1;
          }
        } catch (err) {
          if (!firstError) firstError = err.message;
        }
      }
    });

    return { imported, updated, failed: 0, firstError };
  }
}

