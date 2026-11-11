import crypto from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers.js";
import { IAuthProvider } from "../interfaces/BaseRepository.js";
import { MySqlClient } from "../../db/MySqlClient.js";
import { DatabaseConfig } from "../../config/DatabaseConfig.js";
import { UserEntity } from "../../domain/entities.js";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../domain/errors.js";

const SESSION_COOKIE_NAME = "fintrack_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * MySQL-backed authentication provider using bcryptjs and HTTP-only JWT cookies.
 */
export class MySqlAuthProvider extends IAuthProvider {
  async createSessionToken(user) {
    const secret = DatabaseConfig.getJwtSecret();
    return new SignJWT({ sub: user.id, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);
  }

  async setSessionCookie(token) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }

  async clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }

  mapUserRow(row) {
    return new UserEntity({
      id: row.id,
      email: row.email,
      firstName: row.first_name || "",
      lastName: row.last_name || "",
      currency: row.currency || "INR",
    });
  }

  async getSessionUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, DatabaseConfig.getJwtSecret());
      if (!payload?.sub) return null;

      const rows = await MySqlClient.query(
        "SELECT id, email, first_name, last_name, currency FROM users WHERE id = ? LIMIT 1",
        [payload.sub]
      );
      if (!rows.length) return null;
      return this.mapUserRow(rows[0]);
    } catch {
      return null;
    }
  }

  async signIn(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await MySqlClient.query(
      "SELECT id, email, password_hash, first_name, last_name, currency FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (!rows.length) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const row = rows[0];
    const matches = await bcrypt.compare(password, row.password_hash);
    if (!matches) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const user = this.mapUserRow(row);
    const token = await this.createSessionToken(user);
    await this.setSessionCookie(token);
    return user;
  }

  async signUp({ email, password, firstName = "", lastName = "" }) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await MySqlClient.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      throw new ConflictError("An account with this email already exists");
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await MySqlClient.execute(
      "INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
      [id, normalizedEmail, passwordHash, firstName.trim(), lastName.trim()]
    );

    const user = new UserEntity({
      id,
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      currency: "INR",
    });

    const token = await this.createSessionToken(user);
    await this.setSessionCookie(token);
    return user;
  }

  async signOut() {
    await this.clearSessionCookie();
  }

  async requestPasswordReset(email, origin = "") {
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await MySqlClient.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (!rows.length) {
      // Avoid user enumeration while surfacing success state cleanly
      return { sent: true, resetUrl: null };
    }

    const resetToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = MySqlClient.toMysqlDateTime(Date.now() + 60 * 60 * 1000);

    await MySqlClient.execute(
      "UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?",
      [resetToken, expiresAt, rows[0].id]
    );

    const resetUrl = origin
      ? `${origin}/reset-password?token=${resetToken}`
      : `/reset-password?token=${resetToken}`;

    return { sent: true, resetUrl };
  }

  async resetPassword({ password, token = null }) {
    const passwordHash = await bcrypt.hash(password, 10);

    if (token) {
      const rows = await MySqlClient.query(
        "SELECT id, reset_token_expires_at FROM users WHERE reset_token = ? LIMIT 1",
        [token]
      );

      if (!rows.length) {
        throw new ValidationError("Invalid or expired password reset token");
      }

      const expiresAt = new Date(rows[0].reset_token_expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
        throw new ValidationError("Password reset token has expired");
      }

      await MySqlClient.execute(
        "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?",
        [passwordHash, rows[0].id]
      );
      return { updated: true };
    }

    const sessionUser = await this.getSessionUser();
    if (!sessionUser) {
      throw new UnauthorizedError("Reset token or active session required");
    }

    await MySqlClient.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, sessionUser.id]
    );
    return { updated: true };
  }

  async updateProfile(userId, { firstName, lastName, currency }) {
    const updates = [];
    const params = [];

    if (firstName !== undefined) {
      updates.push("first_name = ?");
      params.push(String(firstName).trim());
    }
    if (lastName !== undefined) {
      updates.push("last_name = ?");
      params.push(String(lastName).trim());
    }
    if (currency !== undefined) {
      updates.push("currency = ?");
      params.push(String(currency).trim().toUpperCase());
    }

    if (updates.length === 0) {
      throw new ValidationError("No profile fields provided to update");
    }

    params.push(userId);
    const result = await MySqlClient.execute(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      throw new NotFoundError("User not found");
    }

    const rows = await MySqlClient.query(
      "SELECT id, email, first_name, last_name, currency FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    return this.mapUserRow(rows[0]);
  }
}

