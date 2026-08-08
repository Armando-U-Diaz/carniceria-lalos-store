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
  return {
    userId,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    aal: data.claims.aal === "aal2" ? "aal2" : "aal1",
    supabase,
  };
}

export async function requireAdmin() {
  const auth = await requireUser("/admin");
  const { data, error } = await auth.supabase.from("profiles").select("id,full_name,phone,avatar_url,role,created_at,updated_at").eq("id", auth.userId).single();
  const profile = data as Profile | null;
  if (error || profile?.role !== "admin") redirect("/perfil?notice=admin");
  if (auth.aal !== "aal2") redirect("/perfil?notice=mfa&next=%2Fadmin");
  return { ...auth, profile };
}
