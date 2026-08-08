"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { CartItem, Product, ProductVariant } from "@/types/domain";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (product: Product, variant?: ProductVariant) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "lalos-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const addItem = useCallback((product: Product, variant?: ProductVariant) => {
    const key = `${product.id}:${variant?.id || "base"}`;
    const stock = variant?.stock ?? product.stock;
    setItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => item.key === key
          ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
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
        quantity: 1,
        stock,
      }];
    });
    setIsOpen(true);
    trackEvent("add_to_cart", { currency: "MXN", value: variant?.price ?? product.price, items: [{ item_id: product.id, item_name: product.name }] });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) => current
      .map((item) => item.key === key ? { ...item, quantity: Math.max(0, Math.min(quantity, item.stock)) } : item)
      .filter((item) => item.quantity > 0));
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => {
      const removed = current.find((item) => item.key === key);
      if (removed) trackEvent("remove_from_cart", { currency: "MXN", value: removed.unitPrice, items: [{ item_id: removed.productId, item_name: removed.name }] });
      return current.filter((item) => item.key !== key);
    });
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    isOpen,
    addItem,
    setQuantity,
    removeItem,
    clear: () => setItems([]),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
  }), [items, isOpen, addItem, setQuantity, removeItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
}
