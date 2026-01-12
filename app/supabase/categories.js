import useSWR from "swr";
import { supabase } from "./supabase-client";
import { useQuery } from "@tanstack/react-query";

export const fetcher = async () => {
    return fetchCategories();
};

const fetchCategories = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return [];
    const { data: categories, error } = await supabase.from('categories').select("*").eq("user_id", user.id);
    if (error) throw error;
    return categories || [];
}


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

export const useCategoriesQuery = () => useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
})
