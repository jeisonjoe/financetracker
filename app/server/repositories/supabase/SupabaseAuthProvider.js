import { IAuthProvider } from "../interfaces/BaseRepository.js";
import { SupabaseServerClient } from "../../db/SupabaseServerClient.js";
import { UserEntity } from "../../domain/entities.js";
import { AppError, UnauthorizedError, ValidationError } from "../../domain/errors.js";

/**
 * Supabase Auth provider implementing IAuthProvider using @supabase/ssr.
 */
export class SupabaseAuthProvider extends IAuthProvider {
  mapSupabaseUser(user) {
    if (!user) return null;
    const meta = user.user_metadata || {};
    return new UserEntity({
      id: user.id,
      email: user.email,
      firstName: meta.first_name || "",
      lastName: meta.last_name || "",
      currency: meta.currency || "INR",
    });
  }

  async getSessionUser() {
    const supabase = await SupabaseServerClient.create();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return this.mapSupabaseUser(user);
  }

  async signIn(email, password) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data?.user) {
      throw new UnauthorizedError(error?.message || "Invalid email or password");
    }

    return this.mapSupabaseUser(data.user);
  }

  async signUp({ email, password, firstName = "", lastName = "" }) {
    const supabase = await SupabaseServerClient.create();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          currency: "INR",
        },
      },
    });

    if (error) {
      throw new ValidationError(error.message);
    }

    if (!data?.user) {
      throw new AppError("Failed to create Supabase user", 500);
    }

    return this.mapSupabaseUser(data.user);
  }

  async signOut() {
    const supabase = await SupabaseServerClient.create();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AppError(error.message, 500);
    }
  }

  async requestPasswordReset(email, origin = "") {
    const supabase = await SupabaseServerClient.create();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      throw new ValidationError(error.message);
    }

    return { sent: true, resetUrl: null };
  }

  async resetPassword({ password }) {
    const supabase = await SupabaseServerClient.create();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new ValidationError(error.message);
    }
    return { updated: true };
  }

  async updateProfile(_userId, { firstName, lastName, currency }) {
    const supabase = await SupabaseServerClient.create();
    const metadata = {};
    if (firstName !== undefined) metadata.first_name = String(firstName).trim();
    if (lastName !== undefined) metadata.last_name = String(lastName).trim();
    if (currency !== undefined) metadata.currency = String(currency).trim().toUpperCase();

    const { data, error } = await supabase.auth.updateUser({ data: metadata });
    if (error || !data?.user) {
      throw new AppError(error?.message || "Failed to update profile", 400);
    }

    return this.mapSupabaseUser(data.user);
  }
}

