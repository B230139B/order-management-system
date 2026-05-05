import client from './client';
import { Product } from '../types';

export const getInventory = async (): Promise<Product[]> => {
  const response = await client.get<Product[]>('/api/inventory');
  return response.data;
};

export const getProducts = async (): Promise<Product[]> => {
  const response = await client.get<Product[]>('/api/products');
  return response.data;
};