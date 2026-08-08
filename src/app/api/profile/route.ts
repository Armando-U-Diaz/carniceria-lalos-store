import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exceedsContentLength, isTrustedMutation } from "@/lib/request-security";
import { profileUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (exceedsContentLength(request, 8_192)) return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 });

  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (claimsError || !userId) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa tus datos." }, { status: 400 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null })
    .eq("id", userId)
    .select("id,full_name,phone,avatar_url,role,created_at,updated_at")
    .single();
  if (error) return NextResponse.json({ error: "No pudimos actualizar el perfil." }, { status: 500 });
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}
