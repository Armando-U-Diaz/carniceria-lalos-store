import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3100"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  MERCADO_PAGO_PUBLIC_URL: z.string().url().refine((value) => value.startsWith("https://"), {
    message: "Mercado Pago requiere una URL pública HTTPS",
  }),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().min(10),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(8),
  MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(600),
});

export const hasSupabaseEnv = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function getPublicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  });
}

export function getServerEnv() {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    MERCADO_PAGO_PUBLIC_URL: process.env.MERCADO_PAGO_PUBLIC_URL,
    MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    MERCADO_PAGO_WEBHOOK_SECRET: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS:
      process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS || 600,
  });
}

export function getSupabaseServiceEnv() {
  const publicEnv = getPublicEnv();
  const serviceKey = z.string().min(10).parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return { ...publicEnv, SUPABASE_SERVICE_ROLE_KEY: serviceKey };
}
