"use client";

import Image from "next/image";
import { Banknote, Plus, Scale, Snowflake, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { saleUnitLabel } from "@/data/products";
import { formatCurrency } from "@/lib/format";
import { formatQuantity, isWeightedUnit, roundMoney, roundQuantity } from "@/lib/quantity";
import type { Product } from "@/types/domain";

type QuantityMode = "weight" | "money";
type WeightInputUnit = "g" | "kg";

export function ProductCard({ product }: { product: Product }) {
  const firstVariant = product.variants.find((item) => item.is_available);
  const [variantId, setVariantId] = useState(firstVariant?.id || "");
  const [added, setAdded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mode, setMode] = useState<QuantityMode>("weight");
  const [weightUnit, setWeightUnit] = useState<WeightInputUnit>("g");
  const [weightValue, setWeightValue] = useState("500");
  const [moneyValue, setMoneyValue] = useState("150");
  const router = useRouter();
  const { addItem, authenticated } = useCart();
  const variant = product.variants.find((item) => item.id === variantId);
  const price = variant?.price ?? product.price;
  const stock = variant?.stock ?? product.stock;
  const weighted = isWeightedUnit(product.sale_unit);
  const available = product.is_available && (variant?.is_available ?? true) && stock > 0;

  const quantity = useMemo(() => {
    const rawValue = Number(mode === "money" ? moneyValue : weightValue);
    if (!Number.isFinite(rawValue) || rawValue <= 0) return 0;
    const kilograms = mode === "money" ? rawValue / price : weightUnit === "g" ? rawValue / 1000 : rawValue;
    return roundQuantity(kilograms, product.sale_unit);
  }, [mode, moneyValue, price, product.sale_unit, weightUnit, weightValue]);
  const calculatedTotal = roundMoney(price * quantity);
  const quantityError = quantity <= 0
    ? "Escribe una cantidad válida."
    : quantity > stock
      ? `Solo hay ${formatQuantity(stock, product.sale_unit)} disponibles.`
      : "";

  const requireSession = () => {
    router.push("/auth?notice=cart&next=%2F%23productos");
  };

  const markAdded = () => {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1300);
  };

  const handlePrimary = () => {
    if (!authenticated) {
      requireSession();
      return;
    }
    if (weighted) {
      setPickerOpen(true);
      return;
    }
    if (addItem(product, variant, 1)) markAdded();
  };

  const handleSelectedQuantity = () => {
    if (!authenticated) {
      requireSession();
      return;
    }
    if (quantityError || !addItem(product, variant, quantity)) return;
    setPickerOpen(false);
    markAdded();
  };

  const choosePreset = (grams: number) => {
    setMode("weight");
    setWeightUnit("g");
    setWeightValue(String(grams));
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
          <div><strong>{formatCurrency(price)}</strong><small> / {weighted ? "kg" : variant?.name || saleUnitLabel[product.sale_unit]}</small></div>
          <button onClick={handlePrimary} disabled={!available} aria-label={`${authenticated ? weighted ? "Elegir cantidad de" : "Agregar" : "Iniciar sesión para comprar"} ${product.name}`}>
            {weighted ? <Scale size={18} /> : <Plus size={19} />} <span>{added ? "Agregado" : authenticated ? weighted ? "Elegir cantidad" : "Agregar" : "Inicia sesión"}</span>
          </button>
        </div>

        {pickerOpen && weighted && (
          <section className="quantity-picker" aria-label={`Elegir cantidad de ${product.name}`}>
            <div className="quantity-picker-heading"><div><strong>¿Cuánto necesitas?</strong><small>Elige por peso o por presupuesto.</small></div><button type="button" onClick={() => setPickerOpen(false)} aria-label="Cerrar selector"><X size={17} /></button></div>
            <div className="quantity-mode" role="tablist" aria-label="Forma de calcular la compra">
              <button type="button" className={mode === "weight" ? "active" : ""} onClick={() => setMode("weight")}><Scale size={15} /> Por peso</button>
              <button type="button" className={mode === "money" ? "active" : ""} onClick={() => setMode("money")}><Banknote size={15} /> Por dinero</button>
            </div>
            {mode === "weight" ? (
              <>
                <div className="quantity-presets">
                  {[250, 500, 750, 1000].map((grams) => <button type="button" className={weightUnit === "g" && Number(weightValue) === grams ? "active" : ""} key={grams} onClick={() => choosePreset(grams)}>{grams === 1000 ? "1 kg" : `${grams} g`}</button>)}
                </div>
                <label className="quantity-input"><span>Cantidad personalizada</span><div><input type="number" inputMode="decimal" min={weightUnit === "g" ? 1 : 0.001} step={weightUnit === "g" ? 1 : 0.001} value={weightValue} onChange={(event) => setWeightValue(event.target.value)} /><select aria-label="Unidad de peso" value={weightUnit} onChange={(event) => setWeightUnit(event.target.value as WeightInputUnit)}><option value="g">gramos</option><option value="kg">kilogramos</option></select></div></label>
              </>
            ) : (
              <label className="quantity-input"><span>¿Cuánto quieres gastar?</span><div className="money-input"><b>$</b><input type="number" inputMode="decimal" min="0.01" step="0.01" value={moneyValue} onChange={(event) => setMoneyValue(event.target.value)} /><em>MXN</em></div></label>
            )}
            <div className="quantity-result">
              <span>{mode === "money" ? "Peso aproximado" : "Tu pedido"}<strong>{quantity > 0 ? formatQuantity(quantity, product.sale_unit) : "—"}</strong></span>
              <span>Total calculado<strong>{formatCurrency(calculatedTotal)}</strong></span>
            </div>
            {mode === "money" && quantity > 0 && <p className="quantity-rounding">El peso se redondea al gramo más cercano, por eso el total puede variar unos centavos.</p>}
            {quantityError && <p className="quantity-error" role="alert">{quantityError}</p>}
            <button type="button" className="button primary wide quantity-add" disabled={Boolean(quantityError)} onClick={handleSelectedQuantity}><Plus size={17} /> Agregar {quantity > 0 ? formatQuantity(quantity, product.sale_unit) : "al carrito"}</button>
          </section>
        )}
      </div>
    </article>
  );
}
