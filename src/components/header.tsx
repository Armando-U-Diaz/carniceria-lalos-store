"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";

const links = [
  ["Inicio", "/#inicio"],
  ["Productos", "/#productos"],
  ["Categorías", "/#categorias"],
  ["Pedidos", "/pedidos"],
] as const;

export function Header() {
  const { itemCount, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner shell">
        <Link href="/" className="brand" aria-label="Carnicería Lalo's, inicio">
          <Image className="brand-logo" src="/brand/lalos-logo.png" alt="" width={46} height={46} priority />
          <span className="brand-copy"><strong>Lalo&apos;s</strong><small>Calidad y frescura</small></span>
        </Link>

        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Navegación principal">
          {links.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
          <Link className="mobile-account" href="/auth" onClick={() => setMenuOpen(false)}>Mi cuenta</Link>
        </nav>

        <div className="header-actions">
          <Link className="icon-button account-button" href="/auth" aria-label="Mi cuenta"><UserRound size={19} /></Link>
          <button className="cart-button" onClick={openCart} aria-label={`Abrir carrito, ${itemCount} productos`}>
            <ShoppingBag size={19} />
            <span>Carrito</span>
            <b>{itemCount}</b>
          </button>
          <button className="icon-button menu-button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Abrir menú">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
