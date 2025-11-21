import supabase from "./supabase-server";

export const getCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: categories } = await supabase.from('categories').select("*").eq("user_id", user.id);
        console.log(categories);
        return categories;
    } else {
        return [];
    }
}