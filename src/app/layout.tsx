import type { Metadata, Viewport } from "next";
import { Analytics } from "@/components/analytics";
import { CartDrawer } from "@/components/cart-drawer";
import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import { hasSupabaseEnv } from "@/lib/env";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Carnicería Lalo's | Cortes frescos a tu mesa", template: "%s | Carnicería Lalo's" },
  description: "Compra cortes frescos, carne de res, cerdo, pollo y paquetes para carne asada. Entrega local y recolección.",
  openGraph: { title: "Carnicería Lalo's", description: "El buen corte empieza aquí.", type: "website", locale: "es_MX", images: [{ url: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=85", width: 1200, height: 630 }] },
  icons: { icon: "/brand/lalos-logo.png" },
};

export const viewport: Viewport = { themeColor: "#5d101b", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const demo = !hasSupabaseEnv();
  return (
    <html lang="es">
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <CartDrawer demo={demo} />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
