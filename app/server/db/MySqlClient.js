import mysql from "mysql2/promise";
import { DatabaseConfig } from "../config/DatabaseConfig.js";

const globalForMysql = globalThis;

/**
 * Singleton OOP wrapper around a mysql2/promise connection pool.
 * Lazily connects only when MySQL is the active DB_PROVIDER.
 */
export class MySqlClient {
  static getPool() {
    if (!globalForMysql.__fintrackMysqlPool) {
      const config = DatabaseConfig.getMysqlConfig();
      globalForMysql.__fintrackMysqlPool = config.uri
        ? mysql.createPool(config.uri)
        : mysql.createPool(config);
    }
    return globalForMysql.__fintrackMysqlPool;
  }

  static async query(sql, params = []) {
    const pool = MySqlClient.getPool();
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async execute(sql, params = []) {
    const pool = MySqlClient.getPool();
    const [result] = await pool.execute(sql, params);
    return result;
  }

  static async withTransaction(callback) {
    const pool = MySqlClient.getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Formats a JS Date or ISO date string into MySQL DATETIME ("YYYY-MM-DD HH:MM:SS").
   */
  static toMysqlDateTime(value) {
    const date = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return safeDate.toISOString().slice(0, 19).replace("T", " ");
  }
}

