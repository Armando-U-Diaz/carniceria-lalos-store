import { Beef, Drumstick, Flame, PackageOpen, Sandwich, Soup, Sparkles, UtensilsCrossed } from "lucide-react";
import type { Category } from "@/types/domain";

const icons = [Beef, UtensilsCrossed, Drumstick, Sparkles, Soup, Sandwich, PackageOpen, Flame];

export function CategoryStrip({ categories }: { categories: Category[] }) {
  return (
    <section className="category-section shell" id="categorias">
      <div className="section-heading compact">
        <div><p className="eyebrow"><span /> Compra por categoría</p><h2>Para cada antojo</h2></div>
        <p>Del diario a la parrilla del domingo.</p>
      </div>
      <div className="category-grid">
        {categories.map((category, index) => {
          const Icon = icons[index % icons.length];
          return <a href={`/?categoria=${encodeURIComponent(category.slug)}#productos`} key={category.id}><span><Icon size={25} /></span><strong>{category.name}</strong></a>;
        })}
      </div>
    </section>
  );
}
