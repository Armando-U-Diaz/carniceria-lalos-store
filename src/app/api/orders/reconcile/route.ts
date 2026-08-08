import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { reconcilePayment } from "@/lib/mercado-pago";
import { exceedsContentLength, isTrustedMutation } from "@/lib/request-security";

const schema = z.object({ orderId: z.string().uuid(), paymentId: z.string().regex(/^\d+$/) });

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (exceedsContentLength(request, 8 * 1024)) return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { data: order } = await supabase.from("orders").select("id,status").eq("id", parsed.data.orderId).eq("user_id", userData.user.id).single();
  if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  try {
    const result = await reconcilePayment(parsed.data.paymentId);
    if (result.orderId !== parsed.data.orderId) return NextResponse.json({ error: "El pago no corresponde a este pedido." }, { status: 409 });
    return NextResponse.json({ ...result, orderStatus: result.paymentStatus === "paid" ? "confirmed" : order.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible conciliar el pago." }, { status: 502 });
  }
}
