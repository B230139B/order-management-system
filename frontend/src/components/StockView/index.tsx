import React from 'react';
import { Product } from '../../types';

interface StockViewProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  loading,
  error,
  onRetry,
}) => {
  if (loading) {
    return (
      <div className="stock-view">
        <h2>Inventory</h2>
        <div className="loading-state">Loading inventory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-view">
        <h2>Inventory</h2>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={onRetry}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-view">
      <h2>Inventory</h2>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>${Number(product.price).toFixed(2)}</td>
              <td>{product.stock}</td>
              <td>
                <span
                  className={`stock-badge ${
                    product.stock === 0
                      ? 'out-of-stock'
                      : product.stock < 10
                      ? 'low-stock'
                      : 'in-stock'
                  }`}
                >
                  {product.stock === 0
                    ? 'Out of Stock'
                    : product.stock < 10
                    ? 'Low Stock'
                    : 'In Stock'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};