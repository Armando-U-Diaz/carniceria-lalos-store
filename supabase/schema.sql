-- Carnicería Lalo's · esquema completo e idempotente para Supabase
-- Ejecutar en SQL Editor con un usuario propietario del proyecto.

create extension if not exists pgcrypto;
create schema if not exists private;

do $$ begin
  create type public.user_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.sale_unit as enum ('kg', 'medio_kg', 'pieza', 'paquete', 'charola');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.delivery_method as enum ('delivery', 'pickup');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text not null,
  image_url text not null,
  price numeric(12,2) not null check (price > 0),
  sale_unit public.sale_unit not null,
  approximate_weight numeric(8,3) check (approximate_weight is null or approximate_weight > 0),
  stock integer not null default 0 check (stock >= 0),
  is_available boolean not null default true,
  is_featured boolean not null default false,
  storage_instructions text not null default 'Mantener refrigerado entre 0 y 4 °C.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  weight numeric(8,3) check (weight is null or weight > 0),
  unit public.sale_unit not null,
  price numeric(12,2) not null check (price > 0),
  stock integer not null default 0 check (stock >= 0),
  is_available boolean not null default true,
  unique (product_id, name)
);

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  customer_name text not null,
  customer_phone text not null,
  delivery_method public.delivery_method not null,
  delivery_address text,
  address_reference text,
  notes text,
  preferred_delivery_at timestamptz,
  mercado_pago_preference_id text,
  mercado_pago_payment_id text,
  mercado_pago_status text,
  mercado_pago_status_detail text,
  mercado_pago_payment_method text,
  mercado_pago_payment_type text,
  mercado_pago_last_event_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches check (total = subtotal + delivery_fee),
  constraint orders_delivery_address check (delivery_method = 'pickup' or nullif(btrim(delivery_address), '') is not null)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  quantity integer not null check (quantity > 0 and quantity <= 50),
  unit_price numeric(12,2) not null check (unit_price > 0),
  subtotal numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  unique (order_id, product_id, product_variant_id)
);

-- Índices de claves foráneas, consultas habituales, RLS y trabajo pendiente.
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_available_category_price_idx on public.products(category_id, price) where is_available;
create index if not exists products_featured_idx on public.products(created_at desc) where is_available and is_featured;
create index if not exists product_variants_product_id_idx on public.product_variants(product_id);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_pending_idx on public.orders(created_at) where status in ('pending', 'confirmed', 'preparing', 'ready', 'delivering');
create index if not exists orders_payment_status_idx on public.orders(payment_status, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id) where product_id is not null;
create index if not exists order_items_variant_id_idx on public.order_items(product_variant_id) where product_variant_id is not null;
create unique index if not exists order_items_line_unique_idx on public.order_items(order_id, product_id, coalesce(product_variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create unique index if not exists orders_mp_payment_unique_idx on public.orders(mercado_pago_payment_id) where mercado_pago_payment_id is not null;
create unique index if not exists orders_mp_preference_unique_idx on public.orders(mercado_pago_preference_id) where mercado_pago_preference_id is not null;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.assign_order_number()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'LL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'avatar_url', ''), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Lee el rol sin provocar recursión de políticas. El esquema private no se expone por Data API.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.assign_order_number() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function private.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function private.set_updated_at();
drop trigger if exists orders_assign_number on public.orders;
create trigger orders_assign_number before insert on public.orders for each row execute function private.assign_order_number();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Permisos de tabla: RLS decide las filas; privilegios de columna impiden cambiar role desde el cliente.
revoke all on public.profiles, public.categories, public.products, public.product_variants, public.orders, public.order_items from anon, authenticated;
grant select on public.categories, public.products, public.product_variants to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, updated_at) on public.profiles to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants to authenticated;
grant select, insert, update on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant usage, select on sequence public.order_number_seq to authenticated;

-- Recrear políticas permite volver a ejecutar el archivo sin duplicados.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select to anon, authenticated using (is_active or (select private.is_admin()));
drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert" on public.categories for insert to authenticated with check ((select private.is_admin()));
drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update" on public.categories for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete" on public.categories for delete to authenticated using ((select private.is_admin()));

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select to anon, authenticated using (is_available or (select private.is_admin()));
drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert" on public.products for insert to authenticated with check ((select private.is_admin()));
drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update" on public.products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete" on public.products for delete to authenticated using ((select private.is_admin()));

drop policy if exists "variants_public_read" on public.product_variants;
create policy "variants_public_read" on public.product_variants for select to anon, authenticated
using ((is_available and exists (select 1 from public.products p where p.id = product_id and p.is_available)) or (select private.is_admin()));
drop policy if exists "variants_admin_insert" on public.product_variants;
create policy "variants_admin_insert" on public.product_variants for insert to authenticated with check ((select private.is_admin()));
drop policy if exists "variants_admin_update" on public.product_variants;
create policy "variants_admin_update" on public.product_variants for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "variants_admin_delete" on public.product_variants;
create policy "variants_admin_delete" on public.product_variants for delete to authenticated using ((select private.is_admin()));

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
drop policy if exists "orders_insert_own_pending" on public.orders;
create policy "orders_insert_own_pending" on public.orders for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'pending' and payment_status = 'pending' and mercado_pago_payment_id is null and paid_at is null);
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "order_items_select_owner_or_admin" on public.order_items;
create policy "order_items_select_owner_or_admin" on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or (select private.is_admin()))));
drop policy if exists "order_items_insert_owner" on public.order_items;
create policy "order_items_insert_owner" on public.order_items for insert to authenticated
with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()) and o.payment_status = 'pending'));

-- Bucket público: lectura por URL pública; mutaciones solamente para administradores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (select private.is_admin()) and lower(storage.extension(name)) = any(array['jpg','jpeg','png','webp']));
drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (select private.is_admin())) with check (bucket_id = 'product-images' and (select private.is_admin()));
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and (select private.is_admin()));

-- Datos de ejemplo. Los UUID estables y ON CONFLICT mantienen idempotencia.
insert into public.categories (id, name, slug, description, sort_order, is_active) values
('10000000-0000-4000-8000-000000000001','Res','res','Cortes frescos seleccionados cada mañana.',1,true),
('10000000-0000-4000-8000-000000000002','Cerdo','cerdo','Sabor, suavidad y excelente rendimiento.',2,true),
('10000000-0000-4000-8000-000000000003','Pollo','pollo','Pollo fresco listo para tu receta.',3,true),
('10000000-0000-4000-8000-000000000004','Cortes premium','cortes-premium','Piezas de marmoleo y calidad sobresaliente.',4,true),
('10000000-0000-4000-8000-000000000005','Carne molida','carne-molida','Molida al momento con la proporción que prefieres.',5,true),
('10000000-0000-4000-8000-000000000006','Embutidos','embutidos','Recetas artesanales llenas de tradición.',6,true),
('10000000-0000-4000-8000-000000000007','Paquetes familiares','paquetes-familiares','Todo lo necesario para compartir en grande.',7,true),
('10000000-0000-4000-8000-000000000008','Complementos','complementos','Los acompañamientos ideales para tu parrilla.',8,true)
on conflict (slug) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order;

insert into public.products (id, category_id, name, slug, description, image_url, price, sale_unit, approximate_weight, stock, is_available, is_featured, storage_instructions) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','Rib Eye','rib-eye','Corte premium con marmoleo generoso, jugoso y perfecto para sellar a fuego alto.','https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=85',429,'kg',1,18,true,true,'Mantener refrigerado entre 0 y 4 °C. Consumir en 48 horas.'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Arrachera marinada','arrachera-marinada','Nuestra marinada de la casa realza un corte suave y lleno de sabor.','https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',319,'kg',1,24,true,true,'Mantener refrigerada y cocinar completamente.'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004','New York','new-york','Corte firme, elegante y con el equilibrio ideal entre carne y grasa.','https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=85',399,'kg',1,16,true,true,'Conservar sellado en refrigeración hasta su preparación.'),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Sirloin','sirloin','Versátil y magro, ideal para parrilla, sartén o fajitas.','https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85',289,'kg',1,28,true,false,'Refrigerar entre 0 y 4 °C.'),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005','Carne molida de res','carne-molida-res','Molida diariamente con carne seleccionada; perfecta para hamburguesas y guisos.','https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=1200&q=85',179,'kg',1,35,true,true,'Consumir el mismo día o mantener congelada.'),
('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','Milanesa de res','milanesa-res','Rebanada delgada y uniforme, lista para empanizar o preparar a la plancha.','https://images.unsplash.com/photo-1588347818036-558601350947?auto=format&fit=crop&w=1200&q=85',229,'kg',1,22,true,false,'Mantener refrigerada y separar por capas.'),
('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000002','Costilla de cerdo','costilla-cerdo','Carnosa, suave y lista para horno, asador o cocción lenta.','https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',189,'kg',1,20,true,true,'Mantener refrigerada; cocinar a temperatura segura.'),
('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000002','Chuleta de cerdo','chuleta-cerdo','Chuleta de corte grueso con el balance justo de grasa.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',169,'kg',1,26,true,false,'Conservar refrigerada en su empaque.'),
('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000003','Pechuga de pollo','pechuga-pollo','Pechuga fresca, limpia y sin piel para comidas ligeras.','https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85',154,'kg',1,30,true,false,'Mantener a 4 °C o menos. Evitar contaminación cruzada.'),
('20000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000003','Pierna y muslo','pierna-muslo','Piezas jugosas, ideales para rostizar, guisar o cocinar al carbón.','https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1200&q=85',94,'kg',1,32,true,false,'Mantener refrigerado y cocinar completamente.'),
('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000006','Chorizo artesanal','chorizo-artesanal','Receta de la casa con mezcla de chiles y especias naturales.','https://images.unsplash.com/photo-1599921841143-819065a55cc6?auto=format&fit=crop&w=1200&q=85',99,'medio_kg',0.5,25,true,true,'Mantener refrigerado y consumir dentro de 4 días.'),
('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000007','Paquete para carne asada','paquete-carne-asada','Arrachera, chorizo, cebollitas y tortillas para reunir a 6 personas.','https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=85',899,'paquete',null,12,true,true,'Refrigerar carnes; conservar complementos en lugar fresco.')
on conflict (slug) do update set category_id=excluded.category_id, name=excluded.name, description=excluded.description, image_url=excluded.image_url, price=excluded.price, sale_unit=excluded.sale_unit, approximate_weight=excluded.approximate_weight, stock=excluded.stock, is_featured=excluded.is_featured, storage_instructions=excluded.storage_instructions;

insert into public.product_variants (product_id, name, weight, unit, price, stock, is_available)
select id, '½ kilogramo', 0.5, 'medio_kg', round(price / 2, 2), stock * 2, true from public.products where sale_unit = 'kg'
on conflict (product_id, name) do update set price=excluded.price, stock=excluded.stock, is_available=excluded.is_available;
insert into public.product_variants (product_id, name, weight, unit, price, stock, is_available)
select id, '1 kilogramo', 1, 'kg', price, stock, true from public.products where sale_unit = 'kg'
on conflict (product_id, name) do update set price=excluded.price, stock=excluded.stock, is_available=excluded.is_available;

-- Catálogo real de Carnicería Lalo's.
insert into public.categories (id, name, slug, description, sort_order, is_active) values
('10000000-0000-4000-8000-000000000001','Res','res','Bisteces, cortes y piezas de res preparados a tu gusto.',1,true),
('10000000-0000-4000-8000-000000000002','Cerdo','cerdo','Carne de cerdo fresca para guisos, horno y parrilla.',2,true),
('10000000-0000-4000-8000-000000000005','Carne molida','carne-molida','Molida de res, cerdo o mixta, preparada al momento.',3,true),
('10000000-0000-4000-8000-000000000003','Pollo','pollo','Pollo fresco y porcionado para cada receta.',4,true)
on conflict (slug) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=excluded.is_active;

update public.categories set is_active=false where slug in ('cortes-premium','embutidos','paquetes-familiares','complementos');
delete from public.products where slug in ('rib-eye','arrachera-marinada','new-york','sirloin','milanesa-res','chuleta-cerdo','chorizo-artesanal','paquete-carne-asada');

with product_seed(category_slug, name, slug, description, image_url, price, sale_unit, approximate_weight, stock, is_featured) as (values
('res','Bistec de res','bistec-res','Bistec fresco cortado al grosor que prefieras. Precio por kilogramo.','https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=85',210,'kg'::public.sale_unit,1::numeric,30,true),
('res','Carne para cocido','carne-para-cocido','Piezas sabrosas para caldos y cocciones lentas. Precio por kilogramo.','https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',150,'kg'::public.sale_unit,1::numeric,28,false),
('res','Suadero','suadero','Suadero de res fresco, ideal para tacos y cocción lenta. Precio por kilogramo.','https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=85',190,'kg'::public.sale_unit,1::numeric,22,false),
('res','Arrachera','arrachera','Corte jugoso y suave, listo para la parrilla. Precio por kilogramo.','https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',280,'kg'::public.sale_unit,1::numeric,20,true),
('res','Rabo de res','rabo-de-res','Se vende completo y el total se calcula de acuerdo con su peso.','https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',150,'kg'::public.sale_unit,1::numeric,10,false),
('res','Pata de res','pata-de-res','Pata de res limpia. Precio por pieza.','https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',110,'pieza'::public.sale_unit,null::numeric,16,false),
('res','Cortes de res','cortes-res','Cortes versátiles para asador o sartén. Precio por kilogramo.','https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=85',190,'kg'::public.sale_unit,1::numeric,20,false),
('res','Cortes premium','cortes-premium','Selección especial para una gran parrillada. Precio por kilogramo.','https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=85',280,'kg'::public.sale_unit,1::numeric,18,true),
('cerdo','Costilla de cerdo','costilla-cerdo','Costilla carnosa para horno, adobo o parrilla. Precio por kilogramo.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',150,'kg'::public.sale_unit,1::numeric,24,true),
('cerdo','Maciza de cerdo','maciza-cerdo','Carne maciza y fresca para tacos, guisos o carnitas. Precio por kilogramo.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',150,'kg'::public.sale_unit,1::numeric,24,false),
('cerdo','Falda de cerdo','falda-cerdo','Falda de cerdo con gran sabor para guisos. Precio por kilogramo.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',150,'kg'::public.sale_unit,1::numeric,20,false),
('cerdo','Carne surtida de cerdo','surtida-cerdo','Selección surtida de cerdo para una preparación completa. Precio por kilogramo.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',150,'kg'::public.sale_unit,1::numeric,22,false),
('cerdo','Espinazo de cerdo','espinazo-cerdo','Espinazo fresco para pozole, caldos y guisos. Precio por kilogramo.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',120,'kg'::public.sale_unit,1::numeric,20,false),
('cerdo','Codillo de cerdo','codillo-cerdo','Codillo para horno o cocción lenta. Precio por kilogramo.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',120,'kg'::public.sale_unit,1::numeric,18,false),
('cerdo','Chamorro de cerdo','chamorro-cerdo','Chamorro suave y carnoso para adobo u horno. Precio por kilogramo.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',120,'kg'::public.sale_unit,1::numeric,18,false),
('cerdo','Manitas de cerdo','manitas-cerdo','Elige enteras o partidas como las necesitas. Precio por kilogramo.','https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=85',80,'kg'::public.sale_unit,1::numeric,20,false),
('carne-molida','Molida de res','carne-molida-res','Carne de res molida al momento. Precio por kilogramo.','https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=1200&q=85',210,'kg'::public.sale_unit,1::numeric,28,true),
('carne-molida','Molida de cerdo','carne-molida-cerdo','Carne de cerdo molida, fresca y lista para cocinar. Precio por kilogramo.','https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=1200&q=85',150,'kg'::public.sale_unit,1::numeric,24,false),
('carne-molida','Molida mixta','carne-molida-mixta','Mezcla de res y cerdo molida al momento. Precio por kilogramo.','https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=1200&q=85',210,'kg'::public.sale_unit,1::numeric,24,false),
('pollo','Pechuga de pollo','pechuga-pollo','Pechuga fresca preparada como la necesites. Precio por kilogramo.','https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85',140,'kg'::public.sale_unit,1::numeric,30,true),
('pollo','Bistec de pechuga','pechuga-aplanada','Pechuga aplanada en bisteces, lista para cocinar. Precio por kilogramo.','https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85',180,'kg'::public.sale_unit,1::numeric,24,false),
('pollo','Pierna o muslo','pierna-muslo','Elige pierna o muslo de pollo fresco. Precio por kilogramo.','https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85',90,'kg'::public.sale_unit,1::numeric,30,false),
('pollo','Alitas de pollo','alitas-pollo','Alitas frescas para hornear, freír o asar. Precio por kilogramo.','https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85',90,'kg'::public.sale_unit,1::numeric,24,false),
('pollo','Retazo de pollo','retazo-pollo','Retazo fresco para caldo o guiso. Precio por kilogramo.','https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85',65,'kg'::public.sale_unit,1::numeric,24,false),
('pollo','Patitas de pollo','patitas-pollo','Patitas de pollo limpias para caldo. Precio por kilogramo.','https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85',25,'kg'::public.sale_unit,1::numeric,20,false)
)
insert into public.products (id, category_id, name, slug, description, image_url, price, sale_unit, approximate_weight, stock, is_available, is_featured, storage_instructions)
select gen_random_uuid(), categories.id, product_seed.name, product_seed.slug, product_seed.description, product_seed.image_url, product_seed.price, product_seed.sale_unit, product_seed.approximate_weight, product_seed.stock, true, product_seed.is_featured, 'Mantener refrigerado entre 0 y 4 °C.'
from product_seed join public.categories on categories.slug=product_seed.category_slug
on conflict (slug) do update set category_id=excluded.category_id, name=excluded.name, description=excluded.description, image_url=excluded.image_url, price=excluded.price, sale_unit=excluded.sale_unit, approximate_weight=excluded.approximate_weight, stock=excluded.stock, is_available=excluded.is_available, is_featured=excluded.is_featured, storage_instructions=excluded.storage_instructions;

delete from public.product_variants using public.products
where product_variants.product_id=products.id and products.slug in ('bistec-res','carne-para-cocido','suadero','arrachera','rabo-de-res','pata-de-res','cortes-res','cortes-premium','costilla-cerdo','maciza-cerdo','falda-cerdo','surtida-cerdo','espinazo-cerdo','codillo-cerdo','chamorro-cerdo','manitas-cerdo','carne-molida-res','carne-molida-cerdo','carne-molida-mixta','pechuga-pollo','pechuga-aplanada','pierna-muslo','alitas-pollo','retazo-pollo','patitas-pollo');

with variant_seed(slug, name) as (values
('bistec-res','Bola'),('bistec-res','Aguayón'),('bistec-res','Centro'),('bistec-res','Espaldilla'),('bistec-res','Picaña'),('bistec-res','Costilla con hueso'),('bistec-res','Costilla sin hueso'),('bistec-res','Diezmillo'),('bistec-res','Planchuela'),('bistec-res','Contra'),('bistec-res','Cuete'),('bistec-res','Cuil'),('bistec-res','Empuje'),('bistec-res','Copete'),
('carne-para-cocido','Pescuezo'),('carne-para-cocido','Costilla'),('carne-para-cocido','Chambarete'),('carne-para-cocido','Paleta'),('carne-para-cocido','Pecho'),('carne-para-cocido','Falda'),
('rabo-de-res','Rabo completo · precio por kg'),('cortes-res','Churrasco'),('cortes-res','Aguja norteña'),
('cortes-premium','Rib-eye'),('cortes-premium','Tomahawk'),('cortes-premium','New York'),('cortes-premium','Cowboy'),('cortes-premium','Filete de res'),
('manitas-cerdo','Enteras'),('manitas-cerdo','Partidas en 2'),('manitas-cerdo','Partidas en 4'),('manitas-cerdo','Partidas en 6'),
('pechuga-pollo','Aplanada'),('pechuga-pollo','Entera'),('pechuga-pollo','Partida'),('pierna-muslo','Pierna'),('pierna-muslo','Muslo')
)
insert into public.product_variants (product_id, name, weight, unit, price, stock, is_available)
select products.id, variant_seed.name, 1, 'kg', products.price, products.stock, true
from variant_seed join public.products on products.slug=variant_seed.slug
on conflict (product_id, name) do update set price=excluded.price, stock=excluded.stock, is_available=excluded.is_available;

-- Verificación rápida (debe devolver seis filas con rls_enabled = true).
select relname as table_name, relrowsecurity as rls_enabled
from pg_class where oid in ('public.profiles'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.product_variants'::regclass, 'public.orders'::regclass, 'public.order_items'::regclass)
order by relname;
