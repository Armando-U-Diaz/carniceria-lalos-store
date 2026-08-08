"use client";

import Image from "next/image";
import { ArrowLeft, ChevronRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { trackEvent } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import type { DeliveryDetails } from "@/types/domain";

const emptyDetails: DeliveryDetails = {
  customerName: "",
  customerPhone: "",
  deliveryMethod: "delivery",
  deliveryAddress: "",
  addressReference: "",
  notes: "",
  preferredDeliveryAt: "",
};

export function CartDrawer({ demo }: { demo: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [checkout, setCheckout] = useState(false);
  const [details, setDetails] = useState(emptyDetails);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const deliveryFee = details.deliveryMethod === "delivery" ? 79 : 0;

  const startCheckout = () => {
    setCheckout(true);
    trackEvent("begin_checkout", { currency: "MXN", value: cart.subtotal, items: cart.items.map((item) => ({ item_id: item.productId, item_name: item.name, quantity: item.quantity })) });
  };

  const submitCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (demo) {
      setError("El catálogo está en modo demostración. Configura Supabase y Mercado Pago para procesar pagos reales.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, preferredDeliveryAt: details.preferredDeliveryAt ? new Date(details.preferredDeliveryAt).toISOString() : "", items: cart.items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })) }),
      });
      const payload = await response.json() as { checkoutUrl?: string; error?: string; loginUrl?: string };
      if (response.status === 401) {
        router.push(payload.loginUrl || "/auth?next=/");
        cart.closeCart();
        return;
      }
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error || "No fue posible iniciar el pago.");
      window.location.assign(payload.checkoutUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className={cart.isOpen ? "drawer-backdrop visible" : "drawer-backdrop"} onClick={cart.closeCart} aria-label="Cerrar carrito" tabIndex={cart.isOpen ? 0 : -1} />
      <aside className={cart.isOpen ? "cart-drawer open" : "cart-drawer"} aria-hidden={!cart.isOpen} aria-label="Carrito de compra">
        <div className="drawer-header">
          {checkout ? <button className="icon-button" onClick={() => setCheckout(false)} aria-label="Volver al carrito"><ArrowLeft size={20} /></button> : <span className="drawer-icon"><ShoppingBag size={19} /></span>}
          <div><p>{checkout ? "Finalizar pedido" : "Tu selección"}</p><small>{cart.itemCount} {cart.itemCount === 1 ? "producto" : "productos"}</small></div>
          <button className="icon-button" onClick={cart.closeCart} aria-label="Cerrar carrito"><X size={21} /></button>
        </div>

        {!checkout ? (
          <>
            <div className="drawer-content">
              {cart.items.length === 0 ? <div className="cart-empty"><span><ShoppingBag size={28} /></span><h3>Tu canasta está vacía</h3><p>Elige un buen corte y nosotros nos encargamos de prepararlo.</p><button className="button primary" onClick={cart.closeCart}>Explorar productos</button></div> : cart.items.map((item) => (
                <article className="cart-line" key={item.key}>
                  <div className="cart-line-image"><Image src={item.imageUrl} alt="" fill sizes="84px" /></div>
                  <div className="cart-line-copy"><strong>{item.name}</strong><small>{item.presentation}</small><b>{formatCurrency(item.unitPrice)}</b><div className="quantity-control"><button onClick={() => cart.setQuantity(item.key, item.quantity - 1)} aria-label="Disminuir cantidad"><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => cart.setQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Aumentar cantidad"><Plus size={14} /></button></div></div>
                  <button className="remove-line" onClick={() => cart.removeItem(item.key)} aria-label={`Eliminar ${item.name}`}><Trash2 size={17} /></button>
                </article>
              ))}
            </div>
            {cart.items.length > 0 && <div className="drawer-summary"><div><span>Subtotal</span><strong>{formatCurrency(cart.subtotal)}</strong></div><p>El costo de entrega se calcula en el siguiente paso.</p><button className="button primary wide" onClick={startCheckout}>Continuar con el pedido <ChevronRight size={18} /></button><small className="secure-note"><ShieldCheck size={15} /> Pago seguro procesado por Mercado Pago</small></div>}
          </>
        ) : (
          <form className="checkout-form" onSubmit={submitCheckout}>
            <div className="checkout-scroll">
              <div className="form-section"><p className="form-kicker">01 · Tus datos</p><label>Nombre completo<input required minLength={3} autoComplete="name" value={details.customerName} onChange={(event) => setDetails({ ...details, customerName: event.target.value })} /></label><label>Teléfono<input required inputMode="tel" autoComplete="tel" placeholder="55 1234 5678" value={details.customerPhone} onChange={(event) => setDetails({ ...details, customerPhone: event.target.value })} /></label></div>
              <div className="form-section"><p className="form-kicker">02 · ¿Cómo lo recibes?</p><div className="delivery-options"><label className={details.deliveryMethod === "delivery" ? "selected" : ""}><input type="radio" name="delivery" checked={details.deliveryMethod === "delivery"} onChange={() => setDetails({ ...details, deliveryMethod: "delivery" })} /><Truck size={19} /><span><strong>A domicilio</strong><small>Desde {formatCurrency(79)}</small></span></label><label className={details.deliveryMethod === "pickup" ? "selected" : ""}><input type="radio" name="delivery" checked={details.deliveryMethod === "pickup"} onChange={() => setDetails({ ...details, deliveryMethod: "pickup" })} /><ShoppingBag size={19} /><span><strong>Recolección</strong><small>Sin costo</small></span></label></div>
              {details.deliveryMethod === "delivery" && <><label>Dirección de entrega<textarea required minLength={10} autoComplete="street-address" rows={2} value={details.deliveryAddress} onChange={(event) => setDetails({ ...details, deliveryAddress: event.target.value })} /></label><label>Referencias<textarea rows={2} placeholder="Portón negro, frente al parque…" value={details.addressReference} onChange={(event) => setDetails({ ...details, addressReference: event.target.value })} /></label></>}</div>
              <div className="form-section"><p className="form-kicker">03 · Detalles</p><label>Horario preferido<input type="datetime-local" value={details.preferredDeliveryAt} onChange={(event) => setDetails({ ...details, preferredDeliveryAt: event.target.value })} /></label><label>Notas para el pedido<textarea rows={2} placeholder="Corte delgado, empacado por separado…" value={details.notes} onChange={(event) => setDetails({ ...details, notes: event.target.value })} /></label></div>
              {error && <p className="form-error" role="alert">{error}</p>}
            </div>
            <div className="checkout-total"><div><span>Subtotal</span><b>{formatCurrency(cart.subtotal)}</b></div><div><span>Entrega</span><b>{deliveryFee ? formatCurrency(deliveryFee) : "Gratis"}</b></div><div className="total-row"><span>Total</span><strong>{formatCurrency(cart.subtotal + deliveryFee)}</strong></div><button className="button primary wide" disabled={loading}>{loading ? "Preparando pago…" : "Ir a Mercado Pago"} <ShieldCheck size={17} /></button><small>Al continuar, saldrás al entorno seguro de Mercado Pago.</small></div>
          </form>
        )}
      </aside>
    </>
  );
}
