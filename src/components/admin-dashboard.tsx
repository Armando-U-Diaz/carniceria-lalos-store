"use client";

import Image from "next/image";
import { Boxes, CheckCircle2, ClipboardList, ImagePlus, LayoutGrid, Minus, PackageOpen, Pencil, Plus, Save, Settings2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Order, Product, SaleUnit } from "@/types/domain";

type Tab = "products" | "orders" | "categories";
type ProductDraft = {
  id?: string; name: string; slug: string; description: string; category_id: string; image_url: string; price: number; sale_unit: SaleUnit; approximate_weight: number | null; stock: number; is_available: boolean; is_featured: boolean; storage_instructions: string;
};

const blankProduct = (categoryId: string): ProductDraft => ({ name: "", slug: "", description: "", category_id: categoryId, image_url: "", price: 0, sale_unit: "kg", approximate_weight: 1, stock: 0, is_available: true, is_featured: false, storage_instructions: "Mantener refrigerado entre 0 y 4 °C." });

export function AdminDashboard({ initialProducts, initialCategories, initialOrders }: { initialProducts: Product[]; initialCategories: Category[]; initialOrders: Order[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [orders, setOrders] = useState(initialOrders);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const metrics = useMemo(() => ({
    products: products.length,
    active: products.filter((product) => product.is_available).length,
    pending: orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length,
    sales: orders.filter((order) => order.payment_status === "paid").reduce((sum, order) => sum + order.total, 0),
  }), [products, orders]);

  const editProduct = (product: Product) => setDraft({ id: product.id, name: product.name, slug: product.slug, description: product.description, category_id: product.category_id, image_url: product.image_url, price: product.price, sale_unit: product.sale_unit, approximate_weight: product.approximate_weight, stock: product.stock, is_available: product.is_available, is_featured: product.is_featured, storage_instructions: product.storage_instructions });

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(draft.id ? `/api/admin/products/${draft.id}` : "/api/admin/products", { method: draft.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json() as { product?: Product; error?: string };
      if (!response.ok || !payload.product) throw new Error(payload.error || "No se pudo guardar.");
      const product = { ...payload.product, category: categories.find((category) => category.id === payload.product?.category_id), variants: payload.product.variants || [] };
      setProducts((current) => draft.id ? current.map((item) => item.id === draft.id ? product : item) : [product, ...current]);
      setDraft(null); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  };

  const uploadImage = async (file?: File) => {
    if (!file || !draft) return;
    const localPreview = URL.createObjectURL(file);
    setDraft({ ...draft, image_url: localPreview }); setSaving(true); setError("");
    try {
      const data = new FormData(); data.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: data });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "No se pudo subir la imagen.");
      setDraft((current) => current ? { ...current, image_url: payload.url as string } : current);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "No se pudo subir la imagen."); }
    finally { URL.revokeObjectURL(localPreview); setSaving(false); }
  };

  const updateStock = async (product: Product, stock: number) => {
    const nextStock = Math.max(0, stock);
    setBusyProductId(product.id); setError("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stock: nextStock }) });
      const payload = await response.json() as { product?: Product; error?: string };
      if (!response.ok || !payload.product) throw new Error(payload.error || "No se pudo actualizar el stock.");
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock: payload.product?.stock ?? nextStock } : item));
    } catch (stockError) { setError(stockError instanceof Error ? stockError.message : "No se pudo actualizar el stock."); }
    finally { setBusyProductId(null); }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Eliminar ${product.name}? Esta acción no se puede deshacer.`)) return;
    setBusyProductId(product.id); setError("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo eliminar el producto.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      router.refresh();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el producto."); }
    finally { setBusyProductId(null); }
  };

  const setOrderStatus = async (order: Order, status: Order["status"]) => {
    const response = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
  };

  const toggleCategory = async (category: Category) => {
    const next = !category.is_active;
    const response = await fetch(`/api/admin/categories/${category.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: next }) });
    if (response.ok) setCategories((current) => current.map((item) => item.id === category.id ? { ...item, is_active: next } : item));
  };

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    const slug = categoryName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: categoryName, slug, description: categoryDescription, sort_order: categories.length, is_active: true }) });
    const payload = await response.json() as { category?: Category; error?: string };
    if (response.ok && payload.category) { setCategories((current) => [...current, payload.category as Category]); setCategoryName(""); setCategoryDescription(""); }
    else setError(payload.error || "No se pudo crear la categoría.");
  };

  return <div className="admin-shell"><aside className="admin-sidebar"><div className="brand admin-brand"><Image className="brand-logo" src="/brand/lalos-logo.png" alt="" width={46} height={46} /><span className="brand-copy"><strong>Lalo&apos;s</strong><small>Administración</small></span></div><nav><button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}><Boxes size={19} /> Productos</button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ClipboardList size={19} /> Pedidos <b>{metrics.pending}</b></button><button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}><LayoutGrid size={19} /> Categorías</button></nav><form action="/auth/signout" method="post"><button><Settings2 size={18} /> Cerrar sesión</button></form></aside><main className="admin-main"><header className="admin-header"><div><small>Panel de administración</small><h1>{tab === "products" ? "Productos" : tab === "orders" ? "Pedidos" : "Categorías"}</h1></div>{tab === "products" && <button className="button primary" onClick={() => setDraft(blankProduct(categories[0]?.id || ""))}><Plus size={17} /> Nuevo producto</button>}</header><section className="metric-grid"><article><span><Boxes size={20} /></span><div><small>Productos</small><strong>{metrics.products}</strong></div></article><article><span><CheckCircle2 size={20} /></span><div><small>Disponibles</small><strong>{metrics.active}</strong></div></article><article><span><PackageOpen size={20} /></span><div><small>Pedidos activos</small><strong>{metrics.pending}</strong></div></article><article><span><ClipboardList size={20} /></span><div><small>Ventas pagadas</small><strong>{formatCurrency(metrics.sales)}</strong></div></article></section>
  {tab === "products" && <section className="admin-panel"><div className="admin-panel-title"><div><h2>Catálogo</h2><p>Ajusta existencias con − y +; edita o elimina productos cuando lo necesites.</p></div></div>{error && <p className="form-error">{error}</p>}<div className="admin-table"><div className="admin-table-head"><span>Producto</span><span>Categoría</span><span>Precio</span><span>Stock</span><span>Estado</span><span /></div>{products.map((product) => <div className="admin-table-row" key={product.id}><div className="admin-product"><span><Image src={product.image_url} alt="" fill sizes="54px" /></span><div><strong>{product.name}</strong><small>/{product.slug}</small></div></div><span>{product.category?.name}</span><strong>{formatCurrency(product.price)}</strong><div className="stock-control"><button type="button" disabled={busyProductId === product.id || product.stock === 0} onClick={() => void updateStock(product, product.stock - 1)} aria-label={`Restar existencia a ${product.name}`}><Minus size={13} /></button><strong>{product.stock}</strong><button type="button" disabled={busyProductId === product.id} onClick={() => void updateStock(product, product.stock + 1)} aria-label={`Agregar existencia a ${product.name}`}><Plus size={13} /></button></div><span className={`status-pill ${product.is_available ? "paid" : "cancelled"}`}>{product.is_available ? "Disponible" : "Oculto"}</span><div className="admin-row-actions"><button className="icon-button" onClick={() => editProduct(product)} aria-label={`Editar ${product.name}`}><Pencil size={17} /></button><button className="icon-button danger" disabled={busyProductId === product.id} onClick={() => void deleteProduct(product)} aria-label={`Eliminar ${product.name}`}><Trash2 size={17} /></button></div></div>)}</div></section>}
  {tab === "orders" && <section className="admin-panel"><div className="admin-panel-title"><div><h2>Pedidos recientes</h2><p>Consulta pagos y actualiza el avance del pedido.</p></div></div><div className="admin-table"><div className="admin-table-head orders"><span>Pedido</span><span>Cliente</span><span>Total</span><span>Pago</span><span>Estado</span></div>{orders.map((order) => <div className="admin-table-row orders" key={order.id}><div><strong>#{order.order_number}</strong><small>{formatDate(order.created_at)}</small></div><div><strong>{order.customer_name}</strong><small>{order.customer_phone}</small></div><strong>{formatCurrency(order.total)}</strong><span className={`status-pill ${order.payment_status}`}>{order.payment_status}</span><select value={order.status} onChange={(event) => void setOrderStatus(order, event.target.value as Order["status"])}><option value="pending">Recibido</option><option value="confirmed">Confirmado</option><option value="preparing">Preparando</option><option value="ready">Listo</option><option value="delivering">En camino</option><option value="delivered">Entregado</option><option value="cancelled">Cancelado</option></select></div>)}</div></section>}
  {tab === "categories" && <section className="category-admin-grid"><form className="admin-panel category-form" onSubmit={createCategory}><h2>Nueva categoría</h2><label>Nombre<input required minLength={2} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label><label>Descripción<textarea rows={4} value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="button primary">Crear categoría</button></form><div className="admin-panel"><h2>Categorías del catálogo</h2><div className="category-admin-list">{categories.map((category) => <div key={category.id}><div><strong>{category.name}</strong><p>{category.description}</p></div><button className={category.is_active ? "toggle on" : "toggle"} onClick={() => void toggleCategory(category)} aria-label={`${category.is_active ? "Desactivar" : "Activar"} ${category.name}`}><span /></button></div>)}</div></div></section>}
  </main>{draft && <div className="modal-backdrop"><form className="product-modal" onSubmit={saveProduct}><header><div><small>{draft.id ? "Editar producto" : "Nuevo producto"}</small><h2>{draft.name || "Agrega un corte"}</h2></div><button type="button" className="icon-button" onClick={() => setDraft(null)}><X size={20} /></button></header><div className="product-form-grid"><label className="image-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event.target.files?.[0])} />{draft.image_url ? <Image src={draft.image_url} alt="Vista previa" fill sizes="260px" unoptimized={draft.image_url.startsWith("blob:")} /> : <span><ImagePlus size={27} /><strong>Subir imagen</strong><small>JPEG, PNG o WebP · Máx. 5 MB</small></span>}</label><div className="product-fields"><div className="two-fields"><label>Nombre<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value, slug: draft.id ? draft.slug : event.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })} /></label><label>Slug<input required value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></label></div><label>Descripción<textarea required minLength={10} rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><div className="two-fields"><label>Categoría<select value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Unidad<select value={draft.sale_unit} onChange={(event) => setDraft({ ...draft, sale_unit: event.target.value as SaleUnit })}><option value="kg">Kilogramo</option><option value="medio_kg">Medio kilogramo</option><option value="pieza">Pieza</option><option value="paquete">Paquete</option><option value="charola">Charola</option></select></label></div><div className="three-fields"><label>Precio MXN<input type="number" step="0.01" min="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label><label>Stock<input type="number" min="0" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Number(event.target.value) })} /></label><label>Peso aprox. kg<input type="number" step="0.01" min="0" value={draft.approximate_weight ?? ""} onChange={(event) => setDraft({ ...draft, approximate_weight: event.target.value ? Number(event.target.value) : null })} /></label></div><label>Conservación<input required value={draft.storage_instructions} onChange={(event) => setDraft({ ...draft, storage_instructions: event.target.value })} /></label><label>URL de imagen<input required type="url" value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} /></label><div className="check-row"><label><input type="checkbox" checked={draft.is_available} onChange={(event) => setDraft({ ...draft, is_available: event.target.checked })} /> Disponible</label><label><input type="checkbox" checked={draft.is_featured} onChange={(event) => setDraft({ ...draft, is_featured: event.target.checked })} /> Destacado</label></div>{error && <p className="form-error">{error}</p>}</div></div><footer><button type="button" className="button secondary" onClick={() => setDraft(null)}>Cancelar</button><button className="button primary" disabled={saving}><Save size={17} /> {saving ? "Guardando…" : "Guardar producto"}</button></footer></form></div>}</div>;
}
