import { DatabaseConfigurationError } from "../domain/errors.js";

/**
 * Central configuration reader for database and auth provider selection.
 * Supports switching seamlessly between "mysql" and "supabase" via DB_PROVIDER.
 */
export class DatabaseConfig {
  static PROVIDERS = Object.freeze({
    MYSQL: "mysql",
    SUPABASE: "supabase",
  });

  static getProvider() {
    const raw = (process.env.DB_PROVIDER || DatabaseConfig.PROVIDERS.MYSQL)
      .trim()
      .toLowerCase();

    if (
      raw !== DatabaseConfig.PROVIDERS.MYSQL &&
      raw !== DatabaseConfig.PROVIDERS.SUPABASE
    ) {
      throw new DatabaseConfigurationError(
        `Unsupported DB_PROVIDER "${raw}". Expected "mysql" or "supabase".`
      );
    }

    return raw;
  }

  static isMysql() {
    return DatabaseConfig.getProvider() === DatabaseConfig.PROVIDERS.MYSQL;
  }

  static isSupabase() {
    return DatabaseConfig.getProvider() === DatabaseConfig.PROVIDERS.SUPABASE;
  }

  static getMysqlConfig() {
    if (process.env.MYSQL_URL) {
      return { uri: process.env.MYSQL_URL };
    }

    const host = process.env.MYSQL_HOST || "127.0.0.1";
    const port = Number(process.env.MYSQL_PORT || 3306);
    const user = process.env.MYSQL_USER || "root";
    const password = process.env.MYSQL_PASSWORD ?? "";
    const database = process.env.MYSQL_DATABASE || "financetracker";

    if (!host || !user || !database) {
      throw new DatabaseConfigurationError(
        "Missing MySQL configuration. Check MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE."
      );
    }

    return {
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "Z",
    };
  }

  static getSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY;

    if (!url || !anonKey) {
      throw new DatabaseConfigurationError(
        "Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_PROJECT_URL and NEXT_PUBLIC_SUPABASE_API_KEY."
      );
    }

    return { url, anonKey };
  }

  static getJwtSecret() {
    const secret =
      process.env.AUTH_JWT_SECRET ||
      process.env.NEXT_PUBLIC_SUPABASE_API_KEY ||
      "fintrack-local-development-secret-key-change-me";
    return new TextEncoder().encode(secret);
  }
}

