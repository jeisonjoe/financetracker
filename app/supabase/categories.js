import useSWR from "swr";
import { supabase } from "./supabase-client";

export const fetcher = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return [];
    const { data: categories, error } = await supabase.from('categories').select("*").eq("user_id", user.id);
    if (error) throw error;
    return categories || [];
};


export function useCategories() {
    const { data, error, isLoading, mutate } = useSWR("categories", fetcher, {
        revalidateOnFocus: false,
    });

    return {
        categories: data || [],
        isLoading,
        error,
        refresh: mutate,
    }
}