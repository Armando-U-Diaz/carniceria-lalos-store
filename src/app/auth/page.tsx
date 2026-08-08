import { Suspense } from "react";
import Image from "next/image";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Mi cuenta" };

export default function AuthPage() {
  return <section className="auth-page"><div className="auth-visual"><Image src="https://images.unsplash.com/photo-1588347818036-558601350947?auto=format&fit=crop&w=1600&q=85" alt="Selección de carnes frescas" fill priority sizes="50vw" /><div><p>Tu carnicería,<br /><em>más cerca.</em></p><span>Compra · Paga · Sigue tu pedido</span></div></div><div className="auth-form-wrap"><Suspense fallback={<div className="auth-card loading-card">Preparando tu cuenta…</div>}><AuthForm /></Suspense></div></section>;
}
