import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers.js";
import { DatabaseConfig } from "../config/DatabaseConfig.js";

/**
 * Factory creating a request-scoped Supabase SSR client with Next.js 15 async cookies.
 */
export class SupabaseServerClient {
  static async create() {
    const { url, anonKey } = DatabaseConfig.getSupabaseConfig();
    const cookieStore = await cookies();

    return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Setting cookies is a no-op inside read-only Server Components.
          }
        },
      },
    });
  }
}

