import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";

export function Story() {
  return (
    <>
      <section className="story-section shell" id="nosotros">
        <div className="story-image"><Image src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=85" alt="Mostrador atendido con cuidado en Carnicería Lalo's" fill sizes="(max-width: 800px) 100vw, 50vw" /><span>Calidad y frescura</span></div>
        <div className="story-copy"><p className="eyebrow"><span /> Oficio y confianza</p><h2>Una carnicería de barrio,<br /><em>hecha para hoy.</em></h2><p>En Lalo&apos;s creemos que comer bien empieza con una pieza fresca y un corte hecho a tu gusto. Encontrarás res, cerdo, carne molida y pollo para cada receta.</p><blockquote>Elige tu producto y presentación; nosotros lo preparamos para que llegue listo a tu mesa.</blockquote><a href="#contacto">Consulta horario y ubicación <ArrowUpRight size={17} /></a></div>
      </section>
      <section className="visit-section" id="contacto"><div className="shell visit-inner"><div><p className="eyebrow light"><span /> Ven a saludarnos</p><h2>Tu pedido, como tú lo quieres.</h2><p>Compra en línea o visita nuestro mostrador. Siempre habrá alguien listo para recomendarte el corte indicado.</p></div><div className="visit-card"><MapPin size={25} /><div><strong>Carnicería Lalo&apos;s</strong><p>Horario de atención<br />08:00 a 17:00</p><a href="https://maps.app.goo.gl/JZFwUkeguNUsYimt8" target="_blank" rel="noreferrer">Abrir ubicación en Google Maps</a></div></div></div></section>
    </>
  );
}
