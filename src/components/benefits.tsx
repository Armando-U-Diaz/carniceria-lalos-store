import { BadgeCheck, ChefHat, HandHeart, ShieldCheck } from "lucide-react";

const benefits = [
  [BadgeCheck, "Calidad garantizada", "Selección experta en cada corte"],
  [ChefHat, "Siempre fresco", "Preparado el día de tu pedido"],
  [ShieldCheck, "Entrega segura", "Cadena de frío y empaque cuidado"],
  [HandHeart, "Atención personal", "Como en el mostrador de siempre"],
] as const;

export function Benefits() {
  return (
    <section className="benefits shell" aria-label="Nuestros beneficios">
      {benefits.map(([Icon, title, text]) => (
        <article key={title}><span><Icon size={23} /></span><div><strong>{title}</strong><p>{text}</p></div></article>
      ))}
    </section>
  );
}
