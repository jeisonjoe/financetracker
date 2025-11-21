import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
    const cookieStore = cookies();
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL, process.env.NEXT_PUBLIC_SUPABASE_API_KEY, {
        cookies: {
            get(name) {
                return cookies().get(name)?.value;
            },
            set(name, value, options) {
            },
            remove(name, options) {
            }
        }
    });
}

const supabase = createSupabaseServerClient();

export default supabase;