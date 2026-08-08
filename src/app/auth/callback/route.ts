import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safePath } from "@/lib/format";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safePath(searchParams.get("next"), "/perfil");
  const baseUrl = process.env.NODE_ENV === "development" ? origin : (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
  if (searchParams.get("error") || searchParams.get("error_code")) {
    return NextResponse.redirect(`${baseUrl}/auth?error=oauth`);
  }
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }
  return NextResponse.redirect(`${baseUrl}/auth?error=callback`);
}
