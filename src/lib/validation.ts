import { z } from "zod";

export const checkoutSchema = z
  .object({
    items: z.array(z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().nullable(),
      quantity: z.number().int().min(1).max(50),
    })).min(1).max(50),
    customerName: z.string().trim().min(3).max(120),
    customerPhone: z.string().trim().regex(/^[0-9+()\-\s]{8,20}$/),
    deliveryMethod: z.enum(["delivery", "pickup"]),
    deliveryAddress: z.string().trim().max(300),
    addressReference: z.string().trim().max(300),
    notes: z.string().trim().max(500),
    preferredDeliveryAt: z.string().datetime().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMethod === "delivery" && data.deliveryAddress.length < 10) {
      ctx.addIssue({ code: "custom", path: ["deliveryAddress"], message: "Escribe una dirección completa." });
    }
    const keys = data.items.map((item) => `${item.productId}:${item.variantId || "base"}`);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "El carrito contiene líneas duplicadas." });
    }
  });

export const adminProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(1000),
  category_id: z.string().uuid(),
  image_url: z.string().url(),
  price: z.coerce.number().positive().max(100000),
  sale_unit: z.enum(["kg", "medio_kg", "pieza", "paquete", "charola"]),
  approximate_weight: z.coerce.number().positive().nullable(),
  stock: z.coerce.number().int().min(0).max(100000),
  is_available: z.boolean(),
  is_featured: z.boolean(),
  storage_instructions: z.string().trim().min(5).max(500),
});
