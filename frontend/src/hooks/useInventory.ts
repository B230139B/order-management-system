import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { getInventory } from '../api/inventory';

export function useInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      setProducts(data);
      setError(null);
    } catch {
      setError('Failed to load inventory. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    const interval = setInterval(fetchInventory, 30000);
    return () => clearInterval(interval);
  }, [fetchInventory]);

  return { products, loading, error, refetch: fetchInventory };
}