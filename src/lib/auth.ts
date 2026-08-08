import "server-only";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

export async function requireUser(next = "/pedidos") {
  if (!hasSupabaseEnv()) redirect(`/auth?next=${encodeURIComponent(next)}&notice=config`);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect(`/auth?next=${encodeURIComponent(next)}`);
  return { userId, email: typeof data.claims.email === "string" ? data.claims.email : null, supabase };
}

export async function requireAdmin() {
  const auth = await requireUser("/admin");
  const { data, error } = await auth.supabase.from("profiles").select("*").eq("id", auth.userId).single();
  const profile = data as Profile | null;
  if (error || profile?.role !== "admin") redirect("/?notice=admin");
  return { ...auth, profile };
}
