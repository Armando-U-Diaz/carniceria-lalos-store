"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { roundMoney, roundQuantity } from "@/lib/quantity";
import type { CartItem, Product, ProductVariant } from "@/types/domain";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  authenticated: boolean;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => boolean;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "lalos-cart-v2";
const LEGACY_STORAGE_KEY = "lalos-cart-v1";

export function CartProvider({ children, authenticated }: { children: React.ReactNode; authenticated: boolean }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (!authenticated) {
      window.localStorage.removeItem(STORAGE_KEY);
      const timeout = window.setTimeout(() => {
        setItems([]);
        setHydrated(true);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    let storedItems: CartItem[] = [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) storedItems = JSON.parse(stored) as CartItem[];
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    const timeout = window.setTimeout(() => {
      setItems(storedItems);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [authenticated]);

  useEffect(() => {
    if (hydrated && authenticated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [authenticated, hydrated, items]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const addItem = useCallback((product: Product, variant?: ProductVariant, requestedQuantity = 1) => {
    if (!authenticated) return false;
    const key = `${product.id}:${variant?.id || "base"}`;
    const stock = variant?.stock ?? product.stock;
    const quantity = roundQuantity(requestedQuantity, product.sale_unit);
    if (quantity <= 0 || quantity > stock) return false;
    setItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => item.key === key
          ? { ...item, quantity: roundQuantity(Math.min(item.quantity + quantity, item.stock), item.saleUnit) }
          : item);
      }
      return [...current, {
        key,
        productId: product.id,
        variantId: variant?.id || null,
        name: product.name,
        slug: product.slug,
        imageUrl: product.image_url,
        presentation: variant?.name || product.sale_unit.replace("_", " "),
        unitPrice: variant?.price ?? product.price,
        quantity,
        stock,
        saleUnit: product.sale_unit,
      }];
    });
    setIsOpen(true);
    trackEvent("add_to_cart", { currency: "MXN", value: roundMoney((variant?.price ?? product.price) * quantity), items: [{ item_id: product.id, item_name: product.name, quantity }] });
    return true;
  }, [authenticated]);

  const setQuantity = useCallback((key: string, quantity: number) => {
    if (!authenticated) return;
    setItems((current) => current
      .map((item) => item.key === key ? { ...item, quantity: roundQuantity(Math.max(0, Math.min(quantity, item.stock)), item.saleUnit) } : item)
      .filter((item) => item.quantity > 0));
  }, [authenticated]);

  const removeItem = useCallback((key: string) => {
    setItems((current) => {
      const removed = current.find((item) => item.key === key);
      if (removed) trackEvent("remove_from_cart", { currency: "MXN", value: removed.unitPrice, items: [{ item_id: removed.productId, item_name: removed.name }] });
      return current.filter((item) => item.key !== key);
    });
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.length,
    subtotal: roundMoney(items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)),
    isOpen,
    authenticated,
    addItem,
    setQuantity,
    removeItem,
    clear: () => setItems([]),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
  }), [items, isOpen, authenticated, addItem, setQuantity, removeItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
}
