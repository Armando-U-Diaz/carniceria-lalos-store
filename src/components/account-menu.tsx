import { LogIn, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function AccountMenu() {
  if (!hasSupabaseEnv()) return <Link className="icon-button account-button" href="/auth" aria-label="Iniciar sesión"><LogIn size={19} /></Link>;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return <Link className="icon-button account-button" href="/auth" aria-label="Iniciar sesión"><UserRound size={19} /></Link>;

  const { data: profile } = await supabase.from("profiles").select("full_name,role").eq("id", userId).single();
  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  const name = profile?.full_name || email || "Mi cuenta";

  return (
    <details className="account-menu">
      <summary className="icon-button account-button" aria-label={`Cuenta de ${name}`}><UserRound size={19} /></summary>
      <div className="account-popover">
        <p><small>Sesión activa</small><strong>{name}</strong>{email && <span>{email}</span>}</p>
        <Link href="/perfil"><UserRound size={16} /> Mi perfil</Link>
        {profile?.role === "admin" && <Link href="/admin"><ShieldCheck size={16} /> Administración</Link>}
        <form action="/auth/signout" method="post"><button><Settings size={16} /> Cerrar sesión</button></form>
      </div>
    </details>
  );
}
