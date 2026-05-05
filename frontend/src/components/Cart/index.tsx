import React, { useState } from "react";
import { CartItem } from "../../types";

interface CartProps {
  items: CartItem[];
  total: number;
  onRemove: (productId: number) => void;
  onCheckout: (items: { product_id: number; quantity: number }[]) => Promise<void>;
  checkoutError: string | null;
}

export const Cart: React.FC<CartProps> = ({
  items,
  total,
  onRemove,
  onCheckout,
  checkoutError,
}) => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setCheckoutLoading(true);
    setLocalError(null);

    try {
      await onCheckout(
        items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      );
    } catch (err: any) {
      setLocalError(err.message || "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart">
        <h2>Shopping Cart</h2>
        <div className="cart-empty">
          <p>Your cart is empty</p>
          <p className="cart-empty-hint">Add products from the inventory to get started.</p>
        </div>
      </div>
    );
  }

  const displayError = localError || checkoutError;

  return (
    <div className="cart">
      <h2>Shopping Cart</h2>
      <ul className="cart-items">
        {items.map((item) => (
          <li key={item.product_id} className="cart-item">
            <div className="cart-item-info">
              <span className="cart-item-name">{item.name}</span>
              <span className="cart-item-price">
                ${item.price.toFixed(2)} x {item.quantity}
              </span>
            </div>
            <div className="cart-item-actions">
              <span className="cart-item-subtotal">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              <button
                className="remove-btn"
                onClick={() => onRemove(item.product_id)}
                aria-label={`Remove ${item.name} from cart`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="cart-summary">
        <div className="cart-total-row">
          <span>Total</span>
          <span className="cart-total-amount">${total.toFixed(2)}</span>
        </div>
        <button
          className="checkout-btn"
          onClick={handleCheckout}
          disabled={checkoutLoading || items.length === 0}
        >
          {checkoutLoading ? (
            <span className="checkout-loading">Processing Order...</span>
          ) : (
            "Place Order"
          )}
        </button>
        {displayError && (
          <div className="error-toast" role="alert">
            {displayError}
          </div>
        )}
      </div>
    </div>
  );
};