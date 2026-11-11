import { IWalletRepository } from "../interfaces/BaseRepository.js";
import { MySqlClient } from "../../db/MySqlClient.js";
import { MySqlSchema } from "../../db/MySqlSchema.js";
import { WalletEntity } from "../../domain/entities.js";
import { NotFoundError } from "../../domain/errors.js";

/**
 * MySQL implementation of IWalletRepository.
 */
export class MySqlWalletRepository extends IWalletRepository {
  async findAllForUser(userId) {
    await MySqlSchema.ensure();
    const rows = await MySqlClient.query(
      `SELECT id, user_id, name, type, opening_balance, created_at
       FROM wallets
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY name ASC`,
      [userId]
    );
    return rows.map((row) => new WalletEntity(row));
  }

  async create(userId, { name, type = "debit", openingBalance = 0 }) {
    await MySqlSchema.ensure();
    const balance = Math.round(Number(openingBalance) || 0);
    const result = await MySqlClient.execute(
      "INSERT INTO wallets (user_id, name, type, opening_balance) VALUES (?, ?, ?, ?)",
      [userId, name.trim(), type, balance]
    );

    const rows = await MySqlClient.query(
      "SELECT id, user_id, name, type, opening_balance, created_at FROM wallets WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    return new WalletEntity(rows[0]);
  }

  async update(id, userId, { name, type, openingBalance }) {
    await MySqlSchema.ensure();
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
    if (openingBalance !== undefined) {
      updates.push("opening_balance = ?");
      params.push(Math.round(Number(openingBalance) || 0));
    }

    if (updates.length === 0) {
      const existing = await MySqlClient.query(
        "SELECT id, user_id, name, type, opening_balance, created_at FROM wallets WHERE id = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1",
        [id, userId]
      );
      if (!existing.length) throw new NotFoundError("Wallet not found");
      return new WalletEntity(existing[0]);
    }

    params.push(id, userId);
    const result = await MySqlClient.execute(
      `UPDATE wallets SET ${updates.join(", ")} WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      params
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Wallet not found");
    }

    const rows = await MySqlClient.query(
      "SELECT id, user_id, name, type, opening_balance, created_at FROM wallets WHERE id = ? LIMIT 1",
      [id]
    );
    return new WalletEntity(rows[0]);
  }

  async delete(id, userId) {
    const result = await MySqlClient.execute(
      "DELETE FROM wallets WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Wallet not found");
    }
    return true;
  }

  async seedDefaultsIfEmpty(userId, defaults) {
    const existing = await this.findAllForUser(userId);
    if (existing.length > 0) return existing;

    for (const item of defaults) {
      await MySqlClient.execute(
        "INSERT INTO wallets (user_id, name, type) VALUES (?, ?, ?)",
        [userId, item.name, item.type || "debit"]
      );
    }

    return this.findAllForUser(userId);
  }
}

