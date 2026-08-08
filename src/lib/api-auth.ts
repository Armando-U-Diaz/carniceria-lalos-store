import "server-only";
import { isTrustedMutation } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";

export async function getAdminApiContext(request: Request) {
  if (!isTrustedMutation(request)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  if (data.claims.aal !== "aal2") return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role !== "admin") return null;
  return { userId, admin: supabase };
}
