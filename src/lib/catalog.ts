import { demoProducts, categories as demoCategories } from "@/data/products";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/types/domain";

export async function getCatalog(): Promise<{ products: Product[]; categories: Category[]; demo: boolean }> {
  if (!hasSupabaseEnv()) return { products: demoProducts, categories: demoCategories, demo: true };

  const supabase = await createClient();
  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(*), variants:product_variants(*)")
      .eq("is_available", true)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
  ]);

  if (productsResult.error) throw new Error(`No se pudo cargar el catálogo: ${productsResult.error.message}`);
  if (categoriesResult.error) throw new Error(`No se pudieron cargar las categorías: ${categoriesResult.error.message}`);

  return {
    products: (productsResult.data || []) as unknown as Product[],
    categories: (categoriesResult.data || []) as Category[],
    demo: false,
  };
}
