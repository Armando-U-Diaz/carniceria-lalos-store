import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiContext } from "@/lib/api-auth";

const statusSchema = z.object({ status: z.enum(["pending", "confirmed", "preparing", "ready", "delivering", "delivered", "cancelled"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const id = z.string().uuid().safeParse((await params).id);
  const body = statusSchema.safeParse(await request.json());
  if (!id.success || !body.success) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const { data, error } = await context.admin.from("orders").update({ status: body.data.status }).eq("id", id.data).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}
