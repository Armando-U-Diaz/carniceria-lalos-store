import { NextResponse } from "next/server";
import { isTrustedMutation } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const response = NextResponse.redirect(new URL("/auth?notice=signed-out", request.url), { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
