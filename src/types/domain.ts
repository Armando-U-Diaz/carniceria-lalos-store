export type UserRole = "customer" | "admin";
export type SaleUnit = "kg" | "medio_kg" | "pieza" | "paquete" | "charola";
export type DeliveryMethod = "delivery" | "pickup";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivering"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  weight: number | null;
  unit: SaleUnit;
  price: number;
  stock: number;
  is_available: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  category?: Category;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  price: number;
  sale_unit: SaleUnit;
  approximate_weight: number | null;
  stock: number;
  is_available: boolean;
  is_featured: boolean;
  storage_instructions: string;
  created_at: string;
  updated_at: string;
  variants: ProductVariant[];
}

export interface CartItem {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  imageUrl: string;
  presentation: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

export interface DeliveryDetails {
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  addressReference: string;
  notes: string;
  preferredDeliveryAt: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  delivery_method: DeliveryMethod;
  delivery_address: string | null;
  address_reference: string | null;
  notes: string | null;
  preferred_delivery_at: string | null;
  mercado_pago_payment_id: string | null;
  mercado_pago_status: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
