"use client";

import Image from "next/image";
import { Plus, Snowflake } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { saleUnitLabel } from "@/data/products";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types/domain";

export function ProductCard({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id || "");
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const variant = product.variants.find((item) => item.id === variantId);
  const price = variant?.price ?? product.price;
  const available = product.is_available && (variant?.is_available ?? true) && (variant?.stock ?? product.stock) > 0;

  const handleAdd = () => {
    addItem(product, variant);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1300);
  };

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 25vw" />
        {product.is_featured && <span className="product-badge">Favorito</span>}
        {!available && <span className="sold-badge">Agotado</span>}
      </div>
      <div className="product-card-body">
        <p className="product-category">{product.category?.name || "Selección Lalo's"}</p>
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <p className="storage-note"><Snowflake size={14} /> {product.storage_instructions}</p>
        {product.variants.length > 0 && (
          <label className="variant-select">
            <span>Presentación</span>
            <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
              {product.variants.filter((item) => item.is_available).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}
        <div className="product-footer">
          <div><strong>{formatCurrency(price)}</strong><small> / {variant?.name || saleUnitLabel[product.sale_unit]}</small></div>
          <button onClick={handleAdd} disabled={!available} aria-label={`Agregar ${product.name} al carrito`}>
            <Plus size={19} /> <span>{added ? "Agregado" : "Agregar"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
