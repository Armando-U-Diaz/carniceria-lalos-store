import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/api-auth";
import { adminProductSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const parsed = adminProductSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  const { data, error } = await context.admin.from("products").insert(parsed.data).select("*").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Ese slug ya está en uso." : error.message }, { status: 409 });
  return NextResponse.json({ product: data }, { status: 201 });
}
