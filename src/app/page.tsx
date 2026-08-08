import { Benefits } from "@/components/benefits";
import { CategoryStrip } from "@/components/category-strip";
import { DemoBanner } from "@/components/demo-banner";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { ProductCatalog } from "@/components/product-catalog";
import { Story } from "@/components/story";
import { getCatalog } from "@/lib/catalog";

export default async function Home() {
  const { products, categories, demo } = await getCatalog();
  return <>{demo && <DemoBanner />}<Hero /><Benefits /><CategoryStrip categories={categories} /><ProductCatalog products={products} categories={categories} /><Story /><Footer /></>;
}
