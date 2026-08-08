import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { hasSupabaseEnv } from "@/lib/env";
import { safePath } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mi cuenta" };

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const query = await searchParams;
  if (hasSupabaseEnv() && query.mode !== "reset" && query.mode !== "update") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) redirect(safePath(query.next || null, "/perfil"));
  }
  return <section className="auth-page"><div className="auth-visual"><Image src="https://images.unsplash.com/photo-1588347818036-558601350947?auto=format&fit=crop&w=1600&q=85" alt="Selección de carnes frescas" fill priority sizes="50vw" /><div><p>Tu carnicería,<br /><em>más cerca.</em></p><span>Compra · Paga · Sigue tu pedido</span></div></div><div className="auth-form-wrap"><Suspense fallback={<div className="auth-card loading-card">Preparando tu cuenta…</div>}><AuthForm /></Suspense></div></section>;
}
