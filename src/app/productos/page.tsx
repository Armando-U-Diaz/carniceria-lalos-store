import { Footer } from "@/components/footer";
import { ProductCatalog } from "@/components/product-catalog";
import { getCatalog } from "@/lib/catalog";

export const metadata = { title: "Productos", description: "Consulta todos los cortes y productos disponibles de Carnicería Lalo's." };

export default async function ProductsPage() {
  const { products, categories } = await getCatalog();
  return <><div className="page-hero small"><div className="shell"><p className="eyebrow light"><span /> Catálogo completo</p><h1>Elige tu próximo corte</h1><p>Fresco, preparado a tu gusto y listo para cocinar.</p></div></div><ProductCatalog products={products} categories={categories} /><Footer /></>;
}
