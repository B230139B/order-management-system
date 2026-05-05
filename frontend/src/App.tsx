import { useState, useCallback } from "react";
import { StockView } from "./components/StockView";
import { Cart } from "./components/Cart";
import { PaymentUpload } from "./components/PaymentUpload";
import { useInventory } from "./hooks/useInventory";
import { useCart } from "./hooks/useCart";
import { createOrder } from "./api/orders";
import { Product, Order } from "./types";
import "./styles/global.css";

type AppView = "shopping" | "payment";

function App() {
  const { products, loading, error, refetch } = useInventory();
  const { cart, addToCart, removeFromCart, clearCart, total } = useCart();

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [view, setView] = useState<AppView>("shopping");

  const handleCheckout = useCallback(
    async (items: { product_id: number; quantity: number }[]) => {
      setCheckoutError(null);
      try {
        const order = await createOrder(items);
        setCreatedOrder(order);
        clearCart();
        setView("payment");
      } catch (err: any) {
        const message =
          err.response?.data?.detail || err.message || "Checkout failed";
        setCheckoutError(message);
        throw err;
      }
    },
    [clearCart]
  );

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return;

    addToCart({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      max_stock: product.stock,
    });
  };

  const handlePaymentSuccess = (_imageUrl: string) => {
    if (createdOrder) {
      setCreatedOrder({
        ...createdOrder,
        status: "payment_under_review",
      });
    }
  };

  const handleBackToShopping = () => {
    setCreatedOrder(null);
    setView("shopping");
    refetch();
  };

  // Payment view after successful order
  if (view === "payment" && createdOrder) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>AI-Empowered Order & Stock Management</h1>
        </header>

        <div className="order-success-banner">
          <h2>Order Placed Successfully!</h2>
          <p>Order ID: <strong>{createdOrder.order_id}</strong></p>
          <p>Total: <strong>${Number(createdOrder.total).toFixed(2)}</strong></p>
        </div>

        <div className="payment-section">
          <PaymentUpload
            orderId={createdOrder.id}
            orderDisplayId={createdOrder.order_id}
            onUploadSuccess={handlePaymentSuccess}
          />
        </div>

        <button className="back-btn" onClick={handleBackToShopping}>
          Continue Shopping
        </button>
      </div>
    );
  }

  // Shopping view
  return (
    <div className="app">
      <header className="app-header">
        <h1>AI-Empowered Order & Stock Management</h1>
      </header>

      <div className="main-layout">
        <section className="inventory-section">
          <StockView
            products={products}
            loading={loading}
            error={error}
            onRetry={refetch}
          />
          <div className="product-actions">
            {products.map((p) => (
              <button
                key={p.id}
                className="add-to-cart-btn"
                onClick={() => handleAddToCart(p)}
                disabled={p.stock === 0}
                title={p.stock === 0 ? "Out of stock" : `Add ${p.name} to cart`}
              >
                + {p.name}
              </button>
            ))}
          </div>
        </section>

        <section className="cart-section">
          <Cart
            items={cart}
            total={total}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
            checkoutError={checkoutError}
          />
        </section>
      </div>
    </div>
  );
}

export default App;