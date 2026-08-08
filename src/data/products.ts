import type { Category, Product, ProductVariant, SaleUnit } from "@/types/domain";

const now = "2026-08-07T12:00:00.000Z";

export const categories: Category[] = [
  ["cat-res", "Res", "res", "Bisteces, cortes y piezas de res preparados a tu gusto."],
  ["cat-cerdo", "Cerdo", "cerdo", "Carne de cerdo fresca para guisos, horno y parrilla."],
  ["cat-molida", "Carne molida", "carne-molida", "Molida de res, cerdo o mixta, preparada al momento."],
  ["cat-pollo", "Pollo", "pollo", "Pollo fresco y porcionado para cada receta."],
].map(([id, name, slug, description], sort_order) => ({
  id: id as string,
  name: name as string,
  slug: slug as string,
  description: description as string,
  sort_order,
  is_active: true,
  created_at: now,
}));

type ProductSeed = {
  slug: string;
  name: string;
  categoryId: string;
  description: string;
  image: string;
  price: number;
  unit?: SaleUnit;
  stock?: number;
  featured?: boolean;
  storage?: string;
  variants?: string[];
};

const beefImage = "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=85";
const stewImage = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85";
const groundImage = "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=1200&q=85";
const porkImage = "https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85";
const chickenImage = "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85";

const seeds: ProductSeed[] = [
  {
    slug: "bistec-res",
    name: "Bistec de res",
    categoryId: "cat-res",
    description: "Bistec fresco cortado al grosor que prefieras. Precio por kilogramo.",
    image: beefImage,
    price: 210,
    stock: 30,
    featured: true,
    variants: ["Bola", "Aguayón", "Centro", "Espaldilla", "Picaña", "Costilla con hueso", "Costilla sin hueso", "Diezmillo", "Planchuela", "Contra", "Cuete", "Cuil", "Empuje", "Copete"],
  },
  {
    slug: "carne-para-cocido",
    name: "Carne para cocido",
    categoryId: "cat-res",
    description: "Piezas sabrosas para caldos y cocciones lentas. Precio por kilogramo.",
    image: stewImage,
    price: 150,
    stock: 28,
    variants: ["Pescuezo", "Costilla", "Chambarete", "Paleta", "Pecho", "Falda"],
  },
  { slug: "suadero", name: "Suadero", categoryId: "cat-res", description: "Suadero de res fresco, ideal para tacos y cocción lenta. Precio por kilogramo.", image: beefImage, price: 190, stock: 22 },
  { slug: "arrachera", name: "Arrachera", categoryId: "cat-res", description: "Corte jugoso y suave, listo para la parrilla. Precio por kilogramo.", image: stewImage, price: 280, stock: 20, featured: true },
  { slug: "rabo-de-res", name: "Rabo de res", categoryId: "cat-res", description: "Se vende completo y el total se calcula de acuerdo con su peso.", image: stewImage, price: 150, stock: 10, variants: ["Rabo completo · precio por kg"] },
  { slug: "pata-de-res", name: "Pata de res", categoryId: "cat-res", description: "Pata de res limpia. Precio por pieza.", image: stewImage, price: 110, unit: "pieza", stock: 16 },
  { slug: "cortes-res", name: "Cortes de res", categoryId: "cat-res", description: "Cortes versátiles para asador o sartén. Precio por kilogramo.", image: beefImage, price: 190, stock: 20, variants: ["Churrasco", "Aguja norteña"] },
  { slug: "cortes-premium", name: "Cortes premium", categoryId: "cat-res", description: "Selección especial para una gran parrillada. Precio por kilogramo.", image: beefImage, price: 280, stock: 18, featured: true, variants: ["Rib-eye", "Tomahawk", "New York", "Cowboy", "Filete de res"] },

  { slug: "costilla-cerdo", name: "Costilla de cerdo", categoryId: "cat-cerdo", description: "Costilla carnosa para horno, adobo o parrilla. Precio por kilogramo.", image: porkImage, price: 150, stock: 24, featured: true },
  { slug: "maciza-cerdo", name: "Maciza de cerdo", categoryId: "cat-cerdo", description: "Carne maciza y fresca para tacos, guisos o carnitas. Precio por kilogramo.", image: porkImage, price: 150, stock: 24 },
  { slug: "falda-cerdo", name: "Falda de cerdo", categoryId: "cat-cerdo", description: "Falda de cerdo con gran sabor para guisos. Precio por kilogramo.", image: porkImage, price: 150, stock: 20 },
  { slug: "surtida-cerdo", name: "Carne surtida de cerdo", categoryId: "cat-cerdo", description: "Selección surtida de cerdo para una preparación completa. Precio por kilogramo.", image: porkImage, price: 150, stock: 22 },
  { slug: "espinazo-cerdo", name: "Espinazo de cerdo", categoryId: "cat-cerdo", description: "Espinazo fresco para pozole, caldos y guisos. Precio por kilogramo.", image: porkImage, price: 120, stock: 20 },
  { slug: "codillo-cerdo", name: "Codillo de cerdo", categoryId: "cat-cerdo", description: "Codillo para horno o cocción lenta. Precio por kilogramo.", image: porkImage, price: 120, stock: 18 },
  { slug: "chamorro-cerdo", name: "Chamorro de cerdo", categoryId: "cat-cerdo", description: "Chamorro suave y carnoso para adobo u horno. Precio por kilogramo.", image: porkImage, price: 120, stock: 18 },
  { slug: "manitas-cerdo", name: "Manitas de cerdo", categoryId: "cat-cerdo", description: "Elige enteras o partidas como las necesitas. Precio por kilogramo.", image: porkImage, price: 80, stock: 20, variants: ["Enteras", "Partidas en 2", "Partidas en 4", "Partidas en 6"] },

  { slug: "carne-molida-res", name: "Molida de res", categoryId: "cat-molida", description: "Carne de res molida al momento. Precio por kilogramo.", image: groundImage, price: 210, stock: 28, featured: true },
  { slug: "carne-molida-cerdo", name: "Molida de cerdo", categoryId: "cat-molida", description: "Carne de cerdo molida, fresca y lista para cocinar. Precio por kilogramo.", image: groundImage, price: 150, stock: 24 },
  { slug: "carne-molida-mixta", name: "Molida mixta", categoryId: "cat-molida", description: "Mezcla de res y cerdo molida al momento. Precio por kilogramo.", image: groundImage, price: 210, stock: 24 },

  { slug: "pechuga-pollo", name: "Pechuga de pollo", categoryId: "cat-pollo", description: "Pechuga fresca preparada como la necesites. Precio por kilogramo.", image: chickenImage, price: 140, stock: 30, featured: true, variants: ["Aplanada", "Entera", "Partida"] },
  { slug: "pechuga-aplanada", name: "Bistec de pechuga", categoryId: "cat-pollo", description: "Pechuga aplanada en bisteces, lista para cocinar. Precio por kilogramo.", image: chickenImage, price: 180, stock: 24 },
  { slug: "pierna-muslo", name: "Pierna o muslo", categoryId: "cat-pollo", description: "Elige pierna o muslo de pollo fresco. Precio por kilogramo.", image: chickenImage, price: 90, stock: 30, variants: ["Pierna", "Muslo"] },
  { slug: "alitas-pollo", name: "Alitas de pollo", categoryId: "cat-pollo", description: "Alitas frescas para hornear, freír o asar. Precio por kilogramo.", image: chickenImage, price: 90, stock: 24 },
  { slug: "retazo-pollo", name: "Retazo de pollo", categoryId: "cat-pollo", description: "Retazo fresco para caldo o guiso. Precio por kilogramo.", image: chickenImage, price: 65, stock: 24 },
  { slug: "patitas-pollo", name: "Patitas de pollo", categoryId: "cat-pollo", description: "Patitas de pollo limpias para caldo. Precio por kilogramo.", image: chickenImage, price: 25, stock: 20 },
];

const makeVariants = (seed: ProductSeed): ProductVariant[] => (seed.variants || []).map((name, index) => ({
  id: `${seed.slug}-variant-${index + 1}`,
  product_id: seed.slug,
  name,
  weight: seed.unit === "pieza" ? null : 1,
  unit: seed.unit || "kg",
  price: seed.price,
  stock: seed.stock ?? 20,
  is_available: true,
}));

export const demoProducts: Product[] = seeds.map((seed) => ({
  id: seed.slug,
  category_id: seed.categoryId,
  category: categories.find((category) => category.id === seed.categoryId),
  name: seed.name,
  slug: seed.slug,
  description: seed.description,
  image_url: seed.image,
  price: seed.price,
  sale_unit: seed.unit || "kg",
  approximate_weight: seed.unit === "pieza" ? null : 1,
  stock: seed.stock ?? 20,
  is_available: true,
  is_featured: seed.featured ?? false,
  storage_instructions: seed.storage || "Mantener refrigerado entre 0 y 4 °C.",
  created_at: now,
  updated_at: now,
  variants: makeVariants(seed),
}));

export const getCategory = (id: string) => categories.find((category) => category.id === id);

export const saleUnitLabel: Record<SaleUnit, string> = {
  kg: "kg",
  medio_kg: "½ kg",
  pieza: "pieza",
  paquete: "paquete",
  charola: "charola",
};
