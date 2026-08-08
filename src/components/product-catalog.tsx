"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { ProductCard } from "@/components/product-card";
import type { Category, Product } from "@/types/domain";

type SortValue = "featured" | "price-asc" | "price-desc" | "newest";

export function ProductCatalog({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<SortValue>("featured");

  useEffect(() => {
    const applyHashFilter = () => {
      const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
      const slug = params.get("categoria");
      setCategory(slug && categories.some((item) => item.slug === slug) ? slug : "all");
    };
    const timeout = window.setTimeout(applyHashFilter, 0);
    window.addEventListener("hashchange", applyHashFilter);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("hashchange", applyHashFilter);
    };
  }, [categories]);

  useEffect(() => {
    if (!query.trim()) return;
    const timer = window.setTimeout(() => trackEvent("search", { search_term: query.trim() }), 500);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase("es-MX").trim();
    return products
      .filter((product) => !normalized || `${product.name} ${product.description}`.toLocaleLowerCase("es-MX").includes(normalized))
      .filter((product) => category === "all" || product.category?.slug === category)
      .filter((product) => !availableOnly || (product.is_available && product.stock > 0))
      .filter((product) => !featuredOnly || product.is_featured)
      .sort((a, b) => {
        if (sort === "price-asc") return a.price - b.price;
        if (sort === "price-desc") return b.price - a.price;
        if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return Number(b.is_featured) - Number(a.is_featured);
      });
  }, [products, query, category, availableOnly, featuredOnly, sort]);

  const clearFilters = () => {
    setQuery(""); setCategory("all"); setAvailableOnly(false); setFeaturedOnly(false); setSort("featured");
  };

  return (
    <section className="catalog-section shell" id="productos">
      <div className="section-heading">
        <div><p className="eyebrow"><span /> Nuestro mostrador</p><h2>Cortes para comer bien</h2></div>
        <p>Seleccionamos, cortamos y empacamos cada pedido con el cuidado de siempre.</p>
      </div>

      <div className="catalog-toolbar">
        <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="¿Qué vas a cocinar hoy?" aria-label="Buscar productos" />{query && <button onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><X size={16} /></button>}</label>
        <label className="select-field"><SlidersHorizontal size={17} /><select value={sort} onChange={(event) => setSort(event.target.value as SortValue)} aria-label="Ordenar productos"><option value="featured">Recomendados</option><option value="price-asc">Precio: menor a mayor</option><option value="price-desc">Precio: mayor a menor</option><option value="newest">Más recientes</option></select></label>
      </div>

      <div className="filter-row">
        <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>Todos</button>
        {categories.map((item) => <button className={category === item.slug ? "active" : ""} key={item.id} onClick={() => setCategory(item.slug)}>{item.name}</button>)}
        <label><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /> Disponibles</label>
        <label><input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} /> Favoritos</label>
      </div>

      <div className="results-line"><p><strong>{filtered.length}</strong> productos</p>{(query || category !== "all" || availableOnly || featuredOnly) && <button onClick={clearFilters}>Limpiar filtros</button>}</div>
      {filtered.length > 0 ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : (
        <div className="empty-state"><span><Search size={28} /></span><h3>No encontramos ese corte</h3><p>Prueba otra búsqueda o limpia los filtros para ver todo el mostrador.</p><button className="button primary" onClick={clearFilters}>Ver todos los productos</button></div>
      )}
    </section>
  );
}
