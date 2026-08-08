import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import { Footer } from "@/components/footer";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Order } from "@/types/domain";

export const metadata = { title: "Mis pedidos" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { userId, supabase } = await requireUser("/pedidos");
  const { data, error } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const orders = (data || []) as Order[];
  return <><section className="page-hero small"><div className="shell"><p className="eyebrow light"><span /> Tu historial</p><h1>Mis pedidos</h1><p>Consulta el pago y sigue la preparación de cada compra.</p></div></section><section className="orders-page shell">{orders.length ? <div className="orders-list">{orders.map((order) => <Link className="order-row" href={`/pedido/${order.id}`} key={order.id}><span className="order-row-icon"><PackageOpen size={22} /></span><div><small>Pedido</small><strong>#{order.order_number}</strong><p>{formatDate(order.created_at)}</p></div><div><small>Total</small><strong>{formatCurrency(order.total)}</strong></div><div><span className={`status-pill ${order.payment_status}`}>{order.payment_status === "paid" ? "Pagado" : order.payment_status === "pending" ? "Pendiente" : "Revisar pago"}</span><p>{order.status === "preparing" ? "En preparación" : order.status === "delivered" ? "Entregado" : "Pedido recibido"}</p></div><ChevronRight size={20} /></Link>)}</div> : <div className="empty-state"><span><PackageOpen size={29} /></span><h2>Todavía no hay pedidos</h2><p>Cuando hagas tu primera compra, aquí podrás ver su avance.</p><Link className="button primary" href="/#productos">Ver productos</Link></div>}</section><Footer /></>;
}
