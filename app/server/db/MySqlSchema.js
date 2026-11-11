import { MySqlClient } from "./MySqlClient.js";

const globalForSchema = globalThis;

/**
 * Ensures new fund-planning tables and columns exist in MySQL/MariaDB.
 * Runs once per process and is safe to call repeatedly.
 */
export class MySqlSchema {
  static async ensure() {
    if (globalForSchema.__fintrackMysqlSchemaReady) return;
    if (globalForSchema.__fintrackMysqlSchemaPromise) {
      return globalForSchema.__fintrackMysqlSchemaPromise;
    }

    globalForSchema.__fintrackMysqlSchemaPromise = MySqlSchema._applyMigrations()
      .then(() => {
        globalForSchema.__fintrackMysqlSchemaReady = true;
      })
      .finally(() => {
        globalForSchema.__fintrackMysqlSchemaPromise = null;
      });

    return globalForSchema.__fintrackMysqlSchemaPromise;
  }

  static async _applyMigrations() {
    // 1. Add opening_balance column to wallets if missing
    const walletCols = await MySqlClient.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallets' AND COLUMN_NAME = 'opening_balance'`
    );
    if (walletCols.length === 0) {
      await MySqlClient.execute(
        "ALTER TABLE wallets ADD COLUMN opening_balance BIGINT NOT NULL DEFAULT 0"
      );
    }

    // 2. Extend transactions.type ENUM to include 'transfer' if needed
    const txTypeCols = await MySqlClient.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'type'`
    );
    const columnType = String(txTypeCols[0]?.COLUMN_TYPE || "").toLowerCase();
    if (columnType && !columnType.includes("'transfer'")) {
      await MySqlClient.execute(
        "ALTER TABLE transactions MODIFY COLUMN type ENUM('income', 'expense', 'transfer') NOT NULL DEFAULT 'expense'"
      );
    }

    // 3. Create fund_goals table
    await MySqlClient.execute(`
      CREATE TABLE IF NOT EXISTS fund_goals (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        name VARCHAR(150) NOT NULL,
        target_amount BIGINT NOT NULL DEFAULT 0,
        current_amount BIGINT NOT NULL DEFAULT 0,
        monthly_contribution BIGINT NOT NULL DEFAULT 0,
        target_date VARCHAR(32) NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fund_goals_user (user_id)
      )
    `);

    // 4. Create recurring_items table
    await MySqlClient.execute(`
      CREATE TABLE IF NOT EXISTS recurring_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        title VARCHAR(150) NOT NULL,
        type ENUM('income', 'expense') NOT NULL DEFAULT 'expense',
        amount BIGINT NOT NULL DEFAULT 0,
        frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
        next_due_date VARCHAR(32) NOT NULL,
        category VARCHAR(150) NOT NULL DEFAULT 'Bills & Utilities',
        wallet VARCHAR(150) NOT NULL DEFAULT 'Cash',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        auto_reserve TINYINT(1) NOT NULL DEFAULT 1,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_recurring_user_due (user_id, next_due_date)
      )
    `);

    // 5. Create fund_plans table (one plan per user)
    await MySqlClient.execute(`
      CREATE TABLE IF NOT EXISTS fund_plans (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36) NOT NULL UNIQUE,
        monthly_income_target BIGINT NOT NULL DEFAULT 0,
        needs_percent INT NOT NULL DEFAULT 50,
        wants_percent INT NOT NULL DEFAULT 30,
        savings_percent INT NOT NULL DEFAULT 20,
        reserve_buffer BIGINT NOT NULL DEFAULT 0,
        category_buckets JSON NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }
}

