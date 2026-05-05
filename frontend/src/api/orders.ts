import client from './client';
import { Order } from '../types';

export const createOrder = async (
  items: { product_id: number; quantity: number }[]
): Promise<Order> => {
  const response = await client.post<{ id: number; order_id: string; total: number; status: string; items: Order['items']; created_at?: string; updated_at?: string }>('/api/orders', {
    items,
  });
  return response.data as Order;
};

export const getOrders = async (): Promise<Order[]> => {
  const response = await client.get<Order[]>('/api/orders');
  return response.data;
};

export const getOrder = async (id: number): Promise<Order> => {
  const response = await client.get<Order>(`/api/orders/${id}`);
  return response.data;
};

export interface PaymentUploadResponse {
  message: string;
  image_url: string;
  order_id: string;
  status: string;
}

export const uploadPayment = async (
  orderId: number,
  file: File
): Promise<PaymentUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post<PaymentUploadResponse>(
    `/api/orders/${orderId}/payment`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};