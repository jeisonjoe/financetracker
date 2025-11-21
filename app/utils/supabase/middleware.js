import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSection(request) {
    let res = NextResponse.next({ request });
    const supabase = supabase.createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
        process.env.NEXT_PUBLIC_SUPABASE_API_KEY, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    res.cookies.set(name, value, options)
                });
            }
        }
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return NextResponse.redirect(redirectUrl);
    }

    return res;
}