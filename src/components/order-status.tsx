"use client";

import { Check, Circle, Clock3, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { trackEvent } from "@/lib/analytics";
import type { OrderStatus, PaymentStatus } from "@/types/domain";

const progress: OrderStatus[] = ["confirmed", "preparing", "ready", "delivering", "delivered"];
const labels: Record<OrderStatus, string> = { pending: "Recibido", confirmed: "Confirmado", preparing: "En preparación", ready: "Listo", delivering: "En camino", delivered: "Entregado", cancelled: "Cancelado" };

export function OrderStatusTracker({ orderId, orderNumber, total, initialOrderStatus, initialPaymentStatus, paymentId }: { orderId: string; orderNumber: string; total: number; initialOrderStatus: OrderStatus; initialPaymentStatus: PaymentStatus; paymentId?: string }) {
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [checking, setChecking] = useState(initialPaymentStatus === "pending" && Boolean(paymentId));
  const { clear } = useCart();

  useEffect(() => {
    if (paymentStatus !== "paid") return;
    clear();
    const trackingKey = `lalos-purchase-${orderId}`;
    if (!window.sessionStorage.getItem(trackingKey)) {
      trackEvent("purchase", { transaction_id: orderNumber, currency: "MXN", value: total });
      window.sessionStorage.setItem(trackingKey, "1");
    }
  }, [paymentStatus, clear, orderId, orderNumber, total]);

  useEffect(() => {
    if (!paymentId || paymentStatus !== "pending") return;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch("/api/orders/reconcile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, paymentId }) });
        if (response.ok) {
          const data = await response.json() as { paymentStatus: PaymentStatus; orderStatus?: OrderStatus };
          setPaymentStatus(data.paymentStatus);
          if (data.orderStatus) setOrderStatus(data.orderStatus);
          if (data.paymentStatus !== "pending") { setChecking(false); return; }
        }
      } finally {
        if (attempts < 10) window.setTimeout(check, 4000); else setChecking(false);
      }
    };
    void check();
  }, [orderId, paymentId, paymentStatus]);

  const activeIndex = progress.indexOf(orderStatus);
  const paymentCopy: Record<PaymentStatus, [string, string]> = {
    paid: ["Pago confirmado", "Mercado Pago confirmó tu compra. Ya estamos preparando todo."],
    pending: ["Pago pendiente", "Estamos esperando la confirmación de Mercado Pago."],
    failed: ["Pago rechazado", "El pago no pudo completarse. Puedes intentarlo nuevamente."],
    cancelled: ["Pago cancelado", "La operación fue cancelada antes de completarse."],
    refunded: ["Pago reembolsado", "El importe fue devuelto por Mercado Pago."],
  };

  return <><div className={`payment-callout ${paymentStatus}`}><span>{checking ? <RefreshCw className="spinning" size={21} /> : paymentStatus === "paid" ? <Check size={21} /> : <Clock3 size={21} />}</span><div><strong>{paymentCopy[paymentStatus][0]}</strong><p>{paymentCopy[paymentStatus][1]}</p></div></div><div className="order-progress">{progress.map((status, index) => { const done = activeIndex >= index && orderStatus !== "cancelled"; const Icon = index === 1 ? PackageCheck : index === 3 ? Truck : done ? Check : Circle; return <div className={done ? "done" : ""} key={status}><span><Icon size={18} /></span><p>{labels[status]}</p></div>; })}</div></>;
}
