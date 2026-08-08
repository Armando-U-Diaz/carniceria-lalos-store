import { CalendarDays, ChevronRight, CircleUserRound, KeyRound, LogOut, PackageOpen, ShieldCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { MfaSecurity } from "@/components/mfa-security";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate, safePath } from "@/lib/format";
import type { Order, Profile } from "@/types/domain";

export const metadata = { title: "Mi perfil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ notice?: string; next?: string }> }) {
  const query = await searchParams;
  const { userId, email, supabase } = await requireUser("/perfil");
  const [{ data: profileData, error: profileError }, { data: orderData, error: ordersError }, { data: userData }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,phone,avatar_url,role,created_at,updated_at").eq("id", userId).single(),
    supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);
  if (profileError || ordersError || !profileData) throw new Error("No pudimos cargar tu perfil.");

  const profile = profileData as Profile;
  const orders = (orderData || []) as Order[];
  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const totalPurchased = paidOrders.reduce((total, order) => total + Number(order.total), 0);
  const user = userData.user;
  const providers = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers as string[] : [];
  const providerCopy = providers.map((provider) => provider === "google" ? "Google" : provider === "email" ? "Correo y contraseña" : provider).join(" · ") || "Correo y contraseña";

  return <>
    <section className="profile-hero">
      <div className="shell">
        <div className="profile-avatar"><CircleUserRound size={42} /></div>
        <div><p className="eyebrow light"><span /> Tu cuenta</p><h1>{profile.full_name || "Mi perfil"}</h1><p>{email}</p></div>
        {profile.role === "admin" && <Link className="button primary cream" href="/admin"><ShieldCheck size={17} /> Ir a administraci&oacute;n</Link>}
      </div>
    </section>

    <section className="profile-page shell">
      {query.notice === "admin" && <div className="access-notice"><ShieldCheck size={20} /><div><strong>Esta cuenta no tiene acceso administrativo.</strong><p>Iniciaste sesi&oacute;n correctamente, pero el panel est&aacute; reservado para administradores.</p></div></div>}
      {query.notice === "mfa" && <div className="access-notice security"><ShieldCheck size={20} /><div><strong>Confirma tu doble verificaci&oacute;n para continuar.</strong><p>El panel administrativo requiere un c&oacute;digo adicional en cada nueva sesi&oacute;n.</p></div></div>}

      <div className="profile-metrics">
        <article><span><ShoppingBag size={20} /></span><div><small>Pedidos</small><strong>{orders.length}</strong></div></article>
        <article><span><PackageOpen size={20} /></span><div><small>Compras pagadas</small><strong>{paidOrders.length}</strong></div></article>
        <article><span><CalendarDays size={20} /></span><div><small>Total comprado</small><strong>{formatCurrency(totalPurchased)}</strong></div></article>
      </div>

      <div className="profile-grid">
        <section className="profile-card">
          <div className="profile-card-heading"><div><p className="eyebrow"><span /> Datos personales</p><h2>Tu informaci&oacute;n</h2></div></div>
          <ProfileForm profile={profile} />
        </section>
        <section className="profile-card security-card">
          <div className="profile-card-heading"><div><p className="eyebrow"><span /> Seguridad</p><h2>Acceso a tu cuenta</h2></div></div>
          <dl>
            <div><dt>Correo</dt><dd>{email}</dd></div>
            <div><dt>Estado</dt><dd><span className="security-ok"><ShieldCheck size={15} /> Correo confirmado</span></dd></div>
            <div><dt>M&eacute;todo de acceso</dt><dd>{providerCopy}</dd></div>
            {user?.last_sign_in_at && <div><dt>&Uacute;ltimo acceso</dt><dd>{formatDate(user.last_sign_in_at)}</dd></div>}
          </dl>
          <MfaSecurity isAdmin={profile.role === "admin"} requestedNext={safePath(query.next ?? null, "/perfil")} />
          <div className="security-actions">
            <Link className="button secondary" href="/auth?mode=reset"><KeyRound size={17} /> Cambiar contrase&ntilde;a</Link>
            <form action="/auth/signout" method="post"><button className="button danger-outline"><LogOut size={17} /> Cerrar sesi&oacute;n</button></form>
          </div>
        </section>
      </div>

      <section className="profile-orders">
        <div className="profile-orders-heading"><div><p className="eyebrow"><span /> Historial</p><h2>Tus pedidos</h2></div>{orders.length > 0 && <Link href="/pedidos">Ver todos <ChevronRight size={16} /></Link>}</div>
        {orders.length ? <div className="orders-list">{orders.slice(0, 5).map((order) => <Link className="order-row" href={`/pedido/${order.id}`} key={order.id}>
          <span className="order-row-icon"><PackageOpen size={22} /></span>
          <div><small>Pedido</small><strong>#{order.order_number}</strong><p>{formatDate(order.created_at)}</p></div>
          <div><small>Total</small><strong>{formatCurrency(order.total)}</strong></div>
          <div><span className={`status-pill ${order.payment_status}`}>{order.payment_status === "paid" ? "Pagado" : order.payment_status === "pending" ? "Pendiente" : "Revisar pago"}</span><p>{order.status === "delivered" ? "Entregado" : order.status === "cancelled" ? "Cancelado" : "En proceso"}</p></div>
          <ChevronRight size={20} />
        </Link>)}</div> : <div className="empty-state compact"><span><PackageOpen size={29} /></span><h2>Todav&iacute;a no hay pedidos</h2><p>Cuando realices una compra, quedar&aacute; guardada aqu&iacute; y en &ldquo;Mis pedidos&rdquo;.</p><Link className="button primary" href="/#productos">Ver productos</Link></div>}
      </section>
    </section>
    <Footer />
  </>;
}
