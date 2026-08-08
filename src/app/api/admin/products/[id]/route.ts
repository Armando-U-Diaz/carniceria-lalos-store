import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminApiContext } from "@/lib/api-auth";
import { adminProductSchema } from "@/lib/validation";

const paramsSchema = z.string().uuid();
const stockSchema = z.object({ stock: z.number().int().min(0) });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const id = paramsSchema.safeParse((await params).id);
  const body = adminProductSchema.safeParse(await request.json());
  if (!id.success || !body.success) return NextResponse.json({ error: body.success ? "ID inválido." : body.error.issues[0]?.message }, { status: 400 });
  const { data: previous } = await context.admin.from("products").select("image_url").eq("id", id.data).single();
  const { data, error } = await context.admin.from("products").update(body.data).eq("id", id.data).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  if (previous?.image_url && previous.image_url !== body.data.image_url) await removeManagedImage(context.admin, previous.image_url as string);
  return NextResponse.json({ product: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const id = paramsSchema.safeParse((await params).id);
  const body = stockSchema.safeParse(await request.json());
  if (!id.success || !body.success) return NextResponse.json({ error: body.success ? "ID inválido." : body.error.issues[0]?.message }, { status: 400 });
  const { data, error } = await context.admin.from("products").update({ stock: body.data.stock }).eq("id", id.data).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ product: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const id = paramsSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  const { data, error } = await context.admin.from("products").delete().eq("id", id.data).select("image_url").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  if (!data) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  if (data.image_url) await removeManagedImage(context.admin, data.image_url as string);
  return NextResponse.json({ ok: true });
}

async function removeManagedImage(admin: SupabaseClient, url: string) {
  const marker = "/storage/v1/object/public/product-images/";
  if (!url.includes(marker)) return;
  const path = decodeURIComponent(url.split(marker)[1] || "");
  if (path) await admin.storage.from("product-images").remove([path]);
}
