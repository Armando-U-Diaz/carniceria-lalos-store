import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { mercadoPagoFetch } from "@/lib/mercado-pago";
import { exceedsContentLength, isTrustedMutation } from "@/lib/request-security";
import { formatQuantity, isWeightedUnit, roundMoney } from "@/lib/quantity";
import { checkoutSchema } from "@/lib/validation";

interface PreferenceResponse { id: string; init_point: string; sandbox_init_point: string; }

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (exceedsContentLength(request, 64 * 1024)) return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Inicia sesión para agregar productos y pagar.", loginUrl: "/auth?notice=cart&next=%2F%23productos" }, { status: 401 });

  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos del pedido." }, { status: 400 });

  const admin = createAdminClient();
  const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
  const variantIds = [...new Set(parsed.data.items.flatMap((item) => item.variantId ? [item.variantId] : []))];
  const [{ data: products, error: productError }, { data: variants, error: variantError }] = await Promise.all([
    admin.from("products").select("id,name,description,image_url,price,sale_unit,stock,is_available").in("id", productIds),
    variantIds.length ? admin.from("product_variants").select("id,product_id,name,price,stock,is_available").in("id", variantIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (productError || variantError) return NextResponse.json({ error: "No pudimos validar el catálogo." }, { status: 502 });

  const productMap = new Map((products || []).map((product) => [product.id as string, product]));
  const variantMap = new Map((variants || []).map((variant) => [variant.id as string, variant]));
  const lines = [];
  for (const requested of parsed.data.items) {
    const product = productMap.get(requested.productId);
    if (!product || !product.is_available) return NextResponse.json({ error: "Uno de los productos ya no está disponible." }, { status: 409 });
    const variant = requested.variantId ? variantMap.get(requested.variantId) : null;
    if (requested.variantId && (!variant || variant.product_id !== product.id || !variant.is_available)) return NextResponse.json({ error: `La presentación elegida de ${product.name} ya no está disponible.` }, { status: 409 });
    const stock = Number(variant?.stock ?? product.stock);
    if (!isWeightedUnit(product.sale_unit) && !Number.isInteger(requested.quantity)) return NextResponse.json({ error: `${product.name} solo se vende en unidades completas.` }, { status: 400 });
    if (requested.quantity > stock) return NextResponse.json({ error: `Solo quedan ${formatQuantity(stock, product.sale_unit)} de ${product.name}.` }, { status: 409 });
    const unitPrice = Number(variant?.price ?? product.price);
    lines.push({ product, variant, saleUnit: product.sale_unit, quantity: requested.quantity, unitPrice, subtotal: roundMoney(unitPrice * requested.quantity) });
  }

  const subtotal = Number(lines.reduce((total, line) => total + line.subtotal, 0).toFixed(2));
  const deliveryFee = parsed.data.deliveryMethod === "delivery" ? 79 : 0;
  const total = Number((subtotal + deliveryFee).toFixed(2));
  const { data: order, error: orderError } = await admin.from("orders").insert({
    user_id: authData.user.id,
    status: "pending",
    payment_status: "pending",
    subtotal,
    delivery_fee: deliveryFee,
    total,
    customer_name: parsed.data.customerName,
    customer_phone: parsed.data.customerPhone,
    delivery_method: parsed.data.deliveryMethod,
    delivery_address: parsed.data.deliveryMethod === "delivery" ? parsed.data.deliveryAddress : null,
    address_reference: parsed.data.addressReference || null,
    notes: parsed.data.notes || null,
    preferred_delivery_at: parsed.data.preferredDeliveryAt || null,
  }).select("id,order_number").single();
  if (orderError || !order) return NextResponse.json({ error: "No pudimos crear el pedido." }, { status: 500 });

  const { error: itemsError } = await admin.from("order_items").insert(lines.map((line) => ({
    order_id: order.id,
    product_id: line.product.id,
    product_variant_id: line.variant?.id || null,
    product_name: line.product.name,
    variant_name: line.variant?.name || null,
    sale_unit: line.saleUnit,
    quantity: line.quantity,
    unit_price: line.unitPrice,
  })));
  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "No pudimos guardar los productos del pedido." }, { status: 500 });
  }

  try {
    const env = getServerEnv();
    const publicUrl = env.MERCADO_PAGO_PUBLIC_URL.replace(/\/$/, "");
    const preference = await mercadoPagoFetch<PreferenceResponse>("/checkout/preferences", {
      method: "POST",
      headers: { "X-Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        items: [
          ...lines.map((line) => ({ id: line.product.id, title: `${line.product.name}${line.variant ? ` · ${line.variant.name}` : ""}${isWeightedUnit(line.saleUnit) ? ` · ${formatQuantity(line.quantity, line.saleUnit)}` : ""}`, description: line.product.description, picture_url: line.product.image_url, quantity: isWeightedUnit(line.saleUnit) ? 1 : line.quantity, currency_id: "MXN", unit_price: isWeightedUnit(line.saleUnit) ? line.subtotal : line.unitPrice })),
          ...(deliveryFee ? [{ id: "delivery", title: "Entrega local", quantity: 1, currency_id: "MXN", unit_price: deliveryFee }] : []),
        ],
        payer: { name: parsed.data.customerName, email: authData.user.email },
        external_reference: order.id,
        metadata: { order_id: order.id, order_number: order.order_number, user_id: authData.user.id },
        back_urls: {
          success: `${publicUrl}/pedido/${order.id}?payment=success`,
          pending: `${publicUrl}/pedido/${order.id}?payment=pending`,
          failure: `${publicUrl}/pedido/${order.id}?payment=failure`,
        },
        auto_return: "approved",
        notification_url: `${publicUrl}/api/mercado-pago/webhook?source_news=webhooks`,
        statement_descriptor: "CARNICERIA LALOS",
      }),
    });
    await admin.from("orders").update({ mercado_pago_preference_id: preference.id }).eq("id", order.id);
    return NextResponse.json({ orderId: order.id, checkoutUrl: preference.init_point || preference.sandbox_init_point });
  } catch (paymentError) {
    await admin.from("orders").update({ payment_status: "failed", mercado_pago_status_detail: paymentError instanceof Error ? paymentError.message.slice(0, 300) : "preference_error" }).eq("id", order.id);
    return NextResponse.json({ error: "El pedido se guardó, pero Mercado Pago no pudo iniciar el cobro. Intenta nuevamente desde tus pedidos.", orderId: order.id }, { status: 502 });
  }
}
