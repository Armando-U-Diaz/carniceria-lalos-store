import { after, NextResponse } from "next/server";
import { reconcilePayment, validateWebhookSignature } from "@/lib/mercado-pago";

export const maxDuration = 10;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({})) as { type?: string; data?: { id?: string | number } };
  const dataId = url.searchParams.get("data.id") || url.searchParams.get("data_id") || (body.data?.id ? String(body.data.id) : null);
  const valid = validateWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!valid) return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  if (body.type !== "payment" || !dataId) return NextResponse.json({ received: true }, { status: 200 });

  after(async () => {
    try { await reconcilePayment(dataId); }
    catch (error) { console.error("Error al conciliar el webhook de Mercado Pago", error); }
  });
  return NextResponse.json({ received: true }, { status: 200 });
}
