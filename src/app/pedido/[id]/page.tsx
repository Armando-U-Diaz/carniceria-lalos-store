import Link from "next/link";
import { ArrowLeft, MapPin, PackageOpen, Store, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { OrderStatusTracker } from "@/components/order-status";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatQuantity } from "@/lib/quantity";
import type { Order } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ payment_id?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const { userId, supabase } = await requireUser(`/pedido/${id}`);
  const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).eq("user_id", userId).single();
  if (error || !data) notFound();
  const order = data as unknown as Order;
  return <><section className="order-detail shell"><Link className="back-link" href="/pedidos"><ArrowLeft size={16} /> Todos mis pedidos</Link><div className="order-title"><div><p>Pedido #{order.order_number}</p><h1>Gracias, {order.customer_name.split(" ")[0]}.</h1><span>Realizado el {formatDate(order.created_at)}</span></div><strong>{formatCurrency(order.total)}</strong></div><OrderStatusTracker orderId={order.id} orderNumber={order.order_number} total={order.total} initialOrderStatus={order.status} initialPaymentStatus={order.payment_status} paymentId={query.payment_id || order.mercado_pago_payment_id || undefined} /><div className="order-columns"><section className="order-panel"><h2><PackageOpen size={19} /> Tu pedido</h2>{order.order_items?.map((item) => <div className="order-item" key={item.id}><span>{formatQuantity(item.quantity, item.sale_unit)}</span><div><strong>{item.product_name}</strong><small>{item.variant_name}</small></div><b>{formatCurrency(item.subtotal)}</b></div>)}<div className="order-totals"><div><span>Subtotal</span><b>{formatCurrency(order.subtotal)}</b></div><div><span>Entrega</span><b>{order.delivery_fee ? formatCurrency(order.delivery_fee) : "Gratis"}</b></div><div><span>Total</span><strong>{formatCurrency(order.total)}</strong></div></div></section><section className="order-panel"><h2>{order.delivery_method === "delivery" ? <Truck size={19} /> : <Store size={19} />} {order.delivery_method === "delivery" ? "Entrega" : "Recolección"}</h2><div className="delivery-detail"><MapPin size={18} /><div><strong>{order.delivery_method === "delivery" ? order.delivery_address : "Recoge en Carnicería Lalo's"}</strong>{order.address_reference && <p>{order.address_reference}</p>}<p>{order.preferred_delivery_at ? `Horario preferido: ${formatDate(order.preferred_delivery_at)}` : "Te avisaremos en cuanto esté listo."}</p></div></div>{order.notes && <div className="order-notes"><small>Notas</small><p>{order.notes}</p></div>}</section></div></section><Footer /></>;
}
