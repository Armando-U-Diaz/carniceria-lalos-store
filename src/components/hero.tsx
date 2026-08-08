import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Clock3, MapPin } from "lucide-react";

export function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-image">
        <Image
          src="https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=2000&q=90"
          alt="Corte premium de res preparado por Carnicería Lalo's"
          fill
          priority
          sizes="100vw"
        />
        <div className="hero-overlay" />
      </div>
      <div className="hero-content shell">
        <div className="hero-copy">
          <p className="eyebrow light"><span /> Selección de cada mañana</p>
          <h1>El buen corte<br /><em>empieza aquí.</em></h1>
          <p className="hero-intro">Carne fresca, cortes hechos a tu gusto y la atención de la carnicería de confianza. Directo a tu mesa.</p>
          <div className="hero-buttons">
            <Link className="button primary cream" href="#productos">Ver productos <ArrowDown size={17} /></Link>
            <a className="button ghost-light" href="https://maps.app.goo.gl/JZFwUkeguNUsYimt8" target="_blank" rel="noreferrer">Cómo llegar</a>
          </div>
        </div>
        <aside className="hero-card" aria-label="Información de servicio">
          <p>Servicio de hoy</p>
          <strong>Abierto de 8:00 am a 5:00 pm</strong>
          <div><Clock3 size={17} /><span>Horario · 08:00–17:00</span></div>
          <div><MapPin size={17} /><span>Entrega local y recolección</span></div>
        </aside>
      </div>
    </section>
  );
}
