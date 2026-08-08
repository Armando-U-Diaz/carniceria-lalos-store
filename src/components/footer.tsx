import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="site-footer"><div className="shell footer-main"><div><Link href="/" className="brand footer-brand"><Image className="brand-logo" src="/brand/lalos-logo.png" alt="" width={46} height={46} /><span className="brand-copy"><strong>Lalo&apos;s</strong><small>Calidad y frescura</small></span></Link><p>Cortes frescos, trato honesto y sabor de casa.</p></div><div><strong>Explora</strong><Link href="/#productos">Productos</Link><Link href="/#categorias">Categorías</Link><Link href="/pedidos">Mis pedidos</Link></div><div><strong>Visítanos</strong><Link href="/auth">Mi cuenta</Link><a href="https://maps.app.goo.gl/JZFwUkeguNUsYimt8" target="_blank" rel="noreferrer">Ver ubicación</a><span>Horario · 08:00 a 17:00</span></div><div><strong>Recibe lo bueno</strong><p>Novedades y consejos para tu próxima parrillada.</p><form><label className="newsletter"><span className="sr-only">Correo electrónico</span><input type="email" placeholder="tu@correo.com" /><button aria-label="Suscribirme">→</button></label></form></div></div><div className="shell footer-bottom"><p>© {new Date().getFullYear()} Carnicería Lalo&apos;s</p><p>Calidad y frescura · Precios en MXN</p></div></footer>
  );
}
