import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/api-auth";
import { exceedsContentLength } from "@/lib/request-security";

const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

export async function POST(request: Request) {
  const context = await getAdminApiContext(request);
  if (!context) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (exceedsContentLength(request, 6 * 1024 * 1024)) return NextResponse.json({ error: "El archivo es demasiado grande." }, { status: 413 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
  const extension = allowedTypes.get(file.type);
  if (!extension) return NextResponse.json({ error: "Usa una imagen JPEG, PNG o WebP." }, { status: 415 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "La imagen no puede pesar más de 5 MB." }, { status: 413 });
  const path = `products/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
  const { error } = await context.admin.storage.from("product-images").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = context.admin.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path }, { status: 201 });
}
