export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  max_stock: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

export type OrderStatus = "pending_payment" | "payment_under_review" | "paid" | "rejected";

export interface Order {
  id: number;
  order_id: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: number;
  order_id: number;
  image_url: string;
  status: string;
  uploaded_at?: string;
}