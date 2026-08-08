import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiContext } from "@/lib/api-auth";

const schema = z.object({ is_active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminApiContext(request);
  if (!context) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const id = z.string().uuid().safeParse((await params).id);
  const body = schema.safeParse(await request.json());
  if (!id.success || !body.success) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const { error } = await context.admin.from("categories").update(body.data).eq("id", id.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
