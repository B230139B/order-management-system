# Progress Report: AI-Empowered Order & Stock Management System

**Candidate:** [Your Name]
**Date:** May 6, 2026
**Duration:** 4 Days
**Role:** Full-Stack Developer (Backend + Frontend)

---

## Daily Breakdown

### Day 1 — Database Design & Requirements

**Objective:** Establish the project foundation and define all requirements.

**Activities:**
- Created `requirements.md` as the **Source of Truth** document
- Designed the PostgreSQL schema with 4 tables:
  - `products` — id, name, price, stock, timestamps
  - `orders` — id, order_id (unique), total, status, timestamps
  - `order_items` — id, order_id (FK), product_id (FK), quantity, unit_price
  - `payments` — id, order_id (FK), image_url, status, uploaded_at
- Defined API endpoints with request/response schemas
- Outlined frontend modules (Stock View, Cart, Payment Upload)
- Specified the order status flow: `pending_payment` → `payment_under_review` → `paid` / `rejected`

**Outcome:** A single `requirements.md` file that guided all subsequent implementation decisions.

---

### Day 2 — Atomic Transactions (Backend Orders API)

**Objective:** Implement `POST /api/orders` with race-condition-safe stock deduction.

**Activities:**
- Built FastAPI router `orders.py` with SQLAlchemy `with_for_update()` row-level locks
- Implemented the atomic pattern:
  ```
  BEGIN transaction
    SELECT ... FOR UPDATE (lock product rows)
    IF stock < quantity → ROLLBACK
    UPDATE products SET stock = stock - qty
    INSERT INTO orders
    INSERT INTO order_items
  COMMIT
  ```
- Added bulk fetch + validation (all products in one query, not N+1)
- Generated unique `order_id` (e.g., `ORD-20260506-A1B2C`)
- Created comprehensive error handling for:
  - Missing products (404)
  - Insufficient stock (409)
  - Empty order items (400)

**Outcome:** `POST /api/orders` atomically deducts stock and creates orders — no overselling possible under concurrent load.

---

### Day 3 — Frontend Integration (Cart Component)

**Objective:** Build the React shopping flow with cart persistence.

**Activities:**
- Created `useCart` hook with localStorage persistence
- Created `useInventory` hook with 30-second auto-refresh
- Built `Cart` component with:
  - Add/remove items with stock validation
  - Running total calculation
  - "Processing Order..." loading state
  - Error toast on checkout failure
- Created `StockView` component with:
  - Table view of all products
  - Color-coded stock badges (In Stock / Low Stock / Out of Stock)
  - Retry button on error
- Integrated both into `App.tsx` with proper TypeScript types

**Outcome:** Fully functional shopping cart with inventory display and localStorage persistence.

---

### Day 4 — Payment Upload Flow

**Objective:** Implement bank slip upload and connect frontend to backend.

**Activities:**
- Built `POST /api/orders/{order_id}/payment` endpoint:
  - File validation (JPEG/PNG only, max 5MB)
  - Saves to `backend/static/payments/{order_id}/`
  - Creates Payment record
  - Updates order status `pending_payment` → `payment_under_review`
- Created `PaymentUpload` component with:
  - Drag-and-drop zone
  - File picker fallback
  - Client-side validation
  - Upload progress spinner
  - Success state with "Payment Under Review" confirmation
- Updated `App.tsx` to switch to payment view after successful order
- Mounted `/static` directory in FastAPI to serve uploaded images

**Outcome:** Complete order → payment → upload flow working end-to-end.

---

## AI Tooling Log

### How Claude Code Was Used

Throughout this project, **Claude Code (CLI)** served as the primary AI collaborator. Here is a summary of how we worked together:

**1. Requirements as Source of Truth**
- All implementation decisions were driven by `requirements.md`
- When implementing a feature, I would first re-read the relevant section of `requirements.md`
- This prevented scope creep and ensured alignment between backend and frontend

**2. Prompting Strategy**
- Each session started with a clear task description
- Example: *"Following the requirements.md, please implement the logic for POST /api/orders. Ensure it uses a PostgreSQL transaction to prevent overselling"*
- Specific file paths and line numbers were included when referencing existing code
- Edge cases (empty cart, concurrent orders, file size limits) were explicitly handled

**3. Environment & Path Issues — Resolved Together**

| Issue | Resolution |
|---|---|
| Virtual environment path issue on Windows | Created venv using `python -m venv venv`, used `./venv/Scripts/python` instead of backslash paths |
| psycopg2-binary build failure (Rust/cargo error) | Upgraded to `psycopg` (version 3.x) which has pre-built wheels for Python 3.13 |
| PostgreSQL authentication failed | Asked user for password, updated `DATABASE_URL` in `config.py` |
| Frontend `package.json` missing | Re-created all Vite boilerplate files manually (tsconfig, vite.config, index.html) |
| TypeScript `--jsx` not set | Fixed `tsconfig.app.json` — changed `jsx` value from `react-jsy` to `react-jsx` |
| Unused variable errors | Removed unused imports (`React`) and variables (`uploadedUrl`, `imageUrl`) |

**4. Build Verification**
- After each implementation, ran `npm run build` (frontend) or `python -c "from app.main import app"` (backend) to verify correctness
- All TypeScript errors were fixed before reporting completion

---

## Core Features Highlight

### 1. Atomic Stock Deduction (PostgreSQL Row-Level Locks)

The `POST /api/orders` endpoint is the most critical piece of the system. It prevents **overselling** (a common concurrency bug) by using:

```python
with db.begin():  # Start transaction
    products = (
        db.query(Product)
        .filter(Product.id.in_(product_ids))
        .with_for_update()  # LOCK product rows
        .all()
    )
    # Validate all stock
    # Deduct stock
    # Create order + items
# Auto-commit on success, auto-rollback on any exception
```

**Why this matters:**
- `SELECT ... FOR UPDATE` locks the rows, so concurrent orders block until this transaction completes
- If two orders try to buy the last item simultaneously, one will succeed and the other will get a "Insufficient stock" error
- The `with db.begin()` context manager ensures we never leave the database in a half-updated state

### 2. Payment Upload Flow

The payment upload connects the frontend to the backend with a clean state transition:

```
User places order
  → order created with status = "pending_payment"
  → frontend shows Payment Upload screen

User drags/drops bank slip image
  → POST /api/orders/{id}/payment
  → Backend saves file to /static/payments/{order_id}/
  → Payment record created
  → Order status updated → "payment_under_review"
  → Frontend shows "Payment Under Review" success state
```

**Security considerations:**
- Only JPEG/PNG allowed (validated by `content-type` check)
- 5MB file size limit enforced server-side
- Order status must be `pending_payment` — cannot upload twice or upload for non-existent order

---

## How to Run

### Prerequisites
- Python 3.13+
- Node.js 18+
- PostgreSQL running on localhost:5432

### Backend

```powershell
# 1. Navigate to backend
cd C:\Users\PC19\Desktop\Intern_Task\backend

# 2. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 3. Run the server (auto-creates tables on first run)
python run.py

# Server runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Frontend

```powershell
# 1. Navigate to frontend
cd C:\Users\PC19\Desktop\Intern_Task\frontend

# 2. Install dependencies (already done)
npm install

# 3. Run dev server
npm run dev

# App runs at http://localhost:5173
# Proxy automatically forwards /api/* to localhost:8000
```

### Database Seed (optional)

```powershell
cd C:\Users\PC19\Desktop\Intern_Task\backend
.\venv\Scripts\Activate.ps1
python seed.py
# Seeds 8 sample products if database is empty
```

---

## Project Structure

```
C:\Users\PC19\Desktop\Intern_Task\
├── requirements.md          ← Source of Truth
├── PROGRESS_REPORT.md      ← This file
├── backend/
│   ├── app/
│   │   ├── models/         (Product, Order, OrderItem, Payment)
│   │   ├── routers/        (inventory, orders, payments)
│   │   ├── schemas/        (Pydantic models)
│   │   ├── main.py         (FastAPI app + CORS + StaticFiles)
│   │   ├── config.py       (DATABASE_URL)
│   │   └── database.py     (SQLAlchemy engine)
│   ├── static/payments/   (uploaded bank slips)
│   ├── requirements.txt
│   ├── seed.py
│   └── run.py
└── frontend/
    ├── src/
    │   ├── api/            (client, inventory, orders)
    │   ├── components/     (Cart, PaymentUpload, StockView)
    │   ├── hooks/          (useCart, useInventory)
    │   ├── types/
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

---

## Verification Checklist

- [x] PostgreSQL tables auto-created (products, orders, order_items, payments)
- [x] 8 sample products seeded
- [x] `POST /api/orders` atomic with row-level locks
- [x] `POST /api/orders/{id}/payment` saves file to /static
- [x] Frontend builds with `npm run build`
- [x] Frontend dev server runs at localhost:5173
- [x] Backend API runs at localhost:8000
- [x] Cart persists across page refreshes (localStorage)
- [x] Payment upload → "Under Review" state transition works

---

*Generated with Claude Code AI Collaborator — May 6, 2026*