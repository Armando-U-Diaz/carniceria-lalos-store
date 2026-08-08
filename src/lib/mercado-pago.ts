import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import type { PaymentStatus } from "@/types/domain";

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string | null;
  payment_type_id: string | null;
  date_approved: string | null;
}

export async function mercadoPagoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { MERCADO_PAGO_ACCESS_TOKEN } = getServerEnv();
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Mercado Pago respondió ${response.status}: ${message.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

export function validateWebhookSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}) {
  const env = getServerEnv();
  if (!input.signature || !input.requestId || !input.dataId) return false;
  const parts = Object.fromEntries(input.signature.split(",").map((part) => part.trim().split("=")));
  const ts = parts.ts;
  const signature = parts.v1;
  if (!ts || !signature) return false;
  const timestamp = Number(ts);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > env.MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS) return false;

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${ts};`;
  const expected = createHmac("sha256", env.MERCADO_PAGO_WEBHOOK_SECRET).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function mapPaymentStatus(status: string): PaymentStatus {
  if (status === "approved") return "paid";
  if (["rejected", "cancelled"].includes(status)) return status === "cancelled" ? "cancelled" : "failed";
  if (status === "refunded" || status === "charged_back") return "refunded";
  return "pending";
}

export async function reconcilePayment(paymentId: string) {
  const payment = await mercadoPagoFetch<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
  if (!payment.external_reference) throw new Error("El pago no contiene external_reference.");
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id,total,payment_status")
    .eq("id", payment.external_reference)
    .single();
  if (error || !order) throw new Error("El pedido indicado por Mercado Pago no existe.");
  if (payment.currency_id !== "MXN" || Number(payment.transaction_amount) !== Number(order.total)) {
    throw new Error("El monto o la moneda del pago no coinciden con el pedido.");
  }

  const paymentStatus = mapPaymentStatus(payment.status);
  const { error: updateError } = await admin.from("orders").update({
    payment_status: paymentStatus,
    status: paymentStatus === "paid" && order.payment_status !== "paid" ? "confirmed" : undefined,
    mercado_pago_payment_id: String(payment.id),
    mercado_pago_status: payment.status,
    mercado_pago_status_detail: payment.status_detail,
    mercado_pago_payment_method: payment.payment_method_id,
    mercado_pago_payment_type: payment.payment_type_id,
    mercado_pago_last_event_at: new Date().toISOString(),
    paid_at: paymentStatus === "paid" ? payment.date_approved || new Date().toISOString() : null,
  }).eq("id", order.id);
  if (updateError) throw new Error(updateError.message);
  return { orderId: order.id as string, paymentStatus };
}
