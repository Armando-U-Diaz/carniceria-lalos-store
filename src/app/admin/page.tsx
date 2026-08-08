import { AdminDashboard } from "@/components/admin-dashboard";
import { requireAdmin } from "@/lib/auth";
import type { Category, Order, Product } from "@/types/domain";

export const metadata = { title: "Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const [productsResult, categoriesResult, ordersResult] = await Promise.all([
    supabase.from("products").select("*, category:categories(*), variants:product_variants(*)").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const error = productsResult.error || categoriesResult.error || ordersResult.error;
  if (error) throw new Error(error.message);
  return <AdminDashboard initialProducts={(productsResult.data || []) as unknown as Product[]} initialCategories={(categoriesResult.data || []) as Category[]} initialOrders={(ordersResult.data || []) as Order[]} />;
}
