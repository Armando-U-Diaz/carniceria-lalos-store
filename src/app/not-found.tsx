import Link from "next/link";
import { ArrowLeft, Beef } from "lucide-react";

export default function NotFound() {
  return <section className="not-found"><span><Beef size={40} /></span><p className="eyebrow"><span /> Error 404</p><h1>Este corte no está<br />en el mostrador.</h1><p>La página que buscas cambió de lugar o ya no está disponible.</p><Link href="/" className="button primary"><ArrowLeft size={17} /> Volver al inicio</Link></section>;
}
