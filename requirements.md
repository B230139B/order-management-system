# AI-Empowered Order & Stock Management System

## 1. Overview

**Project Name:** AI-Empowered Order & Stock Management System

**Core Functionality:** A web-based system that enables real-time inventory tracking, order management with atomic stock deduction, and payment processing with bank slip verification.

**Target Users:** Business operators managing stock and processing customer orders.

---

## 2. Tech Stack

| Layer      | Technology           |
|------------|---------------------|
| Backend    | FastAPI (Python)    |
| Frontend   | Vite + React + TypeScript |
| Database   | PostgreSQL          |

---

## 3. Database Schema

### 3.1 Products Table

| Column     | Type          | Constraints              |
|------------|---------------|--------------------------|
| id         | SERIAL        | PRIMARY KEY              |
| name       | VARCHAR(255)  | NOT NULL                 |
| price      | DECIMAL(10,2) | NOT NULL, CHECK >= 0     |
| stock      | INTEGER       | NOT NULL, DEFAULT 0, CHECK >= 0 |
| created_at | TIMESTAMP     | DEFAULT NOW()            |
| updated_at | TIMESTAMP     | DEFAULT NOW()            |

### 3.2 Orders Table

| Column     | Type          | Constraints              |
|------------|---------------|--------------------------|
| id         | SERIAL        | PRIMARY KEY              |
| order_id   | VARCHAR(50)   | UNIQUE, NOT NULL         |
| total      | DECIMAL(10,2) | NOT NULL                 |
| status     | VARCHAR(50)   | NOT NULL, DEFAULT 'pending_payment' |
| created_at | TIMESTAMP     | DEFAULT NOW()            |
| updated_at | TIMESTAMP     | DEFAULT NOW()            |

**Order Status Flow:**
```
pending_payment -> payment_under_review -> paid -> shipped -> completed
                                    |
                                    v
                               rejected
```

### 3.3 Order Items Table

| Column      | Type          | Constraints              |
|-------------|---------------|--------------------------|
| id          | SERIAL        | PRIMARY KEY              |
| order_id    | INTEGER       | NOT NULL, FK -> orders.id |
| product_id  | INTEGER       | NOT NULL, FK -> products.id |
| quantity    | INTEGER       | NOT NULL, CHECK > 0      |
| unit_price  | DECIMAL(10,2) | NOT NULL                 |

### 3.4 Payments Table

| Column       | Type          | Constraints              |
|--------------|---------------|--------------------------|
| id           | SERIAL        | PRIMARY KEY              |
| order_id     | INTEGER       | NOT NULL, FK -> orders.id |
| image_url    | VARCHAR(500)  | NOT NULL                 |
| status       | VARCHAR(50)   | DEFAULT 'pending_review' |
| uploaded_at  | TIMESTAMP     | DEFAULT NOW()            |

---

## 4. API Endpoints

### 4.1 GET /api/inventory

**Description:** Retrieve real-time stock levels for all products.

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Product A",
      "price": 29.99,
      "stock": 100
    }
  ]
}
```

### 4.2 POST /api/orders

**Description:** Create a new order with atomic transaction for stock deduction.

**Request Body:**
```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ]
}
```

**Behavior:**
- Validate all products exist and sufficient stock is available
- Deduct stock atomically within a database transaction
- If any item fails, rollback entire transaction
- Generate unique order_id (e.g., ORD-20260105-XXXXX)

**Response (201 Created):**
```json
{
  "order_id": "ORD-20260105-A1B2C",
  "total": 89.97,
  "status": "pending_payment",
  "items": [...]
}
```

**Error Response (400/409):**
```json
{
  "detail": "Insufficient stock for product: Product A"
}
```

### 4.3 POST /api/orders/{id}/payment

**Description:** Upload bank slip image for an order.

**Path Parameters:**
- `id`: Order ID (integer)

**Request:** multipart/form-data with file upload
- Field name: `file`
- Allowed types: image/jpeg, image/png, image/jpg
- Max size: 5MB

**Behavior:**
- Validate file exists and is allowed type
- Save file to `uploads/payments/{order_id}/{filename}`
- Create payment record linked to order
- Update order status to `payment_under_review`

**Response (201 Created):**
```json
{
  "message": "Payment uploaded successfully",
  "image_url": "/uploads/payments/ORD-20260105-A1B2C/bank_slip.jpg"
}
```

### 4.4 Additional Endpoints

| Method | Endpoint              | Description                     |
|--------|-----------------------|---------------------------------|
| GET    | /api/orders           | List all orders (with filters)  |
| GET    | /api/orders/{id}      | Get single order details        |
| GET    | /api/products        | List all products               |
| POST   | /api/products        | Create a product (admin)       |
| PUT    | /api/products/{id}    | Update a product (admin)       |

---

## 5. Frontend Modules

### 5.1 Stock Balance View

**Purpose:** Display real-time inventory levels.

**Features:**
- Table view of all products with columns: Name, Price, Stock
- Visual indicators for low stock (< 10 units) and out-of-stock items
- Auto-refresh every 30 seconds
- Search/filter by product name

**States:**
- Loading: Skeleton loader
- Loaded: Product table with stock badges
- Error: Error message with retry button

### 5.2 Cart Logic

**Purpose:** Manage product selection and order creation.

**Features:**
- Add products with quantity selector
- Running total calculation
- Stock validation before adding to cart
- Persist cart in localStorage
- Place order with single-click checkout

**Cart Item Structure:**
```typescript
interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  max_stock: number;
}
```

**States:**
- Empty cart: "Your cart is empty" message
- With items: Item list + total + checkout button
- Submitting: Loading state on checkout
- Error: Toast notification with error message

### 5.3 Payment Upload UI

**Purpose:** Allow users to upload bank slip for order payment.

**Features:**
- Drag-and-drop file upload zone
- File type validation (jpg, png, jpeg)
- File size display and limit warning
- Upload progress indicator
- Preview of uploaded image
- Confirmation message after successful upload

**States:**
- Idle: Upload zone with instructions
- Dragging: Highlighted drop zone
- Uploading: Progress bar
- Success: Confirmation with order status
- Error: Error message with retry option

### 5.4 Order Status Display

**Purpose:** Show current order status to user.

**Features:**
- Order card with status badge
- Status timeline visualization
- Payment upload button (when status is `pending_payment`)
- Order details expansion

**Status Badges:**
- `pending_payment`: Yellow badge
- `payment_under_review`: Blue badge
- `paid`: Green badge
- `rejected`: Red badge

---

## 6. Order Status Flow

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────┐
│  pending_payment │────▶│ payment_under_review │────▶│ paid │
└─────────────────┘     └──────────────────────┘     └──────┘
                                │
                                ▼
                         ┌──────────┐
                         │ rejected │
                         └──────────┘
```

| Status              | Description                                      |
|---------------------|--------------------------------------------------|
| pending_payment     | Order created, awaiting bank slip upload        |
| payment_under_review| Bank slip uploaded, awaiting verification       |
| paid                | Payment verified successfully                    |
| rejected            | Payment verification failed                     |

---

## 7. Project Structure

### Backend (FastAPI)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── product.py
│   │   ├── order.py
│   │   └── payment.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── product.py
│   │   ├── order.py
│   │   └── payment.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── inventory.py
│   │   ├── orders.py
│   │   └── payments.py
│   └── services/
│       ├── __init__.py
│       └── order_service.py
├── uploads/
│   └── payments/
├── requirements.txt
└── run.py
```

### Frontend (Vite + React + TypeScript)

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts
│   │   ├── inventory.ts
│   │   ├── orders.ts
│   │   └── payments.ts
│   ├── components/
│   │   ├── StockView/
│   │   ├── Cart/
│   │   ├── PaymentUpload/
│   │   └── OrderStatus/
│   ├── hooks/
│   │   ├── useCart.ts
│   │   └── useInventory.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── global.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 8. Acceptance Criteria

### Backend
- [ ] GET /api/inventory returns all products with current stock
- [ ] POST /api/orders creates order and deducts stock atomically
- [ ] POST /api/orders/{id}/payment accepts file upload and saves to disk
- [ ] All endpoints return appropriate HTTP status codes
- [ ] Stock deduction is atomic (rollback on failure)
- [ ] Unique order_id generated for each order

### Frontend
- [ ] Stock view displays real-time inventory with low-stock warnings
- [ ] Cart allows adding products with quantity validation against stock
- [ ] Cart persists across page refreshes (localStorage)
- [ ] Checkout creates order and clears cart
- [ ] Payment upload accepts drag-and-drop and file picker
- [ ] Order status displays correctly with appropriate badge colors
- [ ] All forms handle loading and error states

### Database
- [ ] All tables created with proper constraints
- [ ] Foreign key relationships enforced
- [ ] Stock cannot go negative
- [ ] Unique constraint on order_id

---

## 9. Configuration

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/order_stock_db
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=5242880  # 5MB in bytes
```

### CORS Configuration

Allow frontend origin (default: http://localhost:5173 for Vite dev server)