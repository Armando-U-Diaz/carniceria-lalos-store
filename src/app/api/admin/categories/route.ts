import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiContext } from "@/lib/api-auth";

const schema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().max(300), sort_order: z.number().int().min(0), is_active: z.boolean() });

export async function POST(request: Request) {
  const context = await getAdminApiContext(request);
  if (!context) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const { data, error } = await context.admin.from("categories").insert(parsed.data).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ category: data }, { status: 201 });
}
