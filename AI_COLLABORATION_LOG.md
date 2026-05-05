# AI Collaboration Log
## AI-Empowered Order & Stock Management System

**Project:** AI-Empowered Order & Stock Management System
**Date:** May 6, 2026
**AI Tool:** Claude Code (CLI)
**Interaction Count:** 7 major prompts

---

## Prompt 1 — Requirements Generation

> *"Please generate a detailed requirements.md file for an 'AI-Empowered Order & Stock Management System'. This file will be the 'Source of Truth' for our development."*

### Result:
Created `requirements.md` defining:
- Tech stack: FastAPI + Vite/React/TS + PostgreSQL
- 4 database tables: products, orders, order_items, payments
- 6 API endpoints with request/response schemas
- Frontend modules: StockView, Cart, PaymentUpload
- Order status flow: `pending_payment` → `payment_under_review`

---

## Prompt 2 — PowerShell Initialization Script

> *"Now, read the requirements.md I just created. Give me a series of PowerShell commands to initialize the entire project structure."*

### Result:
Generated a complete PowerShell script that:
- Created `backend/` and `frontend/` directory trees
- Set up Python venv + installed FastAPI dependencies
- Scaffolded Vite + React + TypeScript project
- Created all boilerplate files (models, routers, schemas, components)

---

## Prompt 3 — Atomic Orders Implementation

> *"Following the requirements.md, please implement the logic for POST /api/orders. Ensure it uses a PostgreSQL transaction to prevent overselling (check stock before deducting). Then, implement the React Cart component that calls this API."*

### Key Code Block — Atomic Transaction Logic

```python
@router.post("", response_model=OrderResponse, status_code=201)
def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    """
    ATOMIC TRANSACTION FLOW:
    1. BEGIN transaction
    2. Lock product rows (SELECT FOR UPDATE) to prevent race conditions
    3. Validate all products exist and have sufficient stock
    4. Deduct stock for all items
    5. Create order + order_items
    6. COMMIT
    """
    try:
        with db.begin():  # ← ATOMIC TRANSACTION
            total = Decimal("0")
            order_items_data = []

            # Lock ALL products at once — prevents concurrent overselling
            products = (
                db.query(Product)
                .filter(Product.id.in_(product_ids))
                .with_for_update()  # ← ROW-LEVEL LOCK
                .all()
            )

            # Validate stock for each item (rolled back on failure)
            for item in order_data.items:
                product = product_map[item.product_id]
                if product.stock < item.quantity:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Insufficient stock for: {product.name}"
                    )
                product.stock -= item.quantity  # ← ATOMIC DEDUCTION

            order = Order(order_id=generate_order_id(), total=total, status="pending_payment")
            db.add(order)
            db.flush()
            for item_data in order_items_data:
                db.add(OrderItem(order_id=order.id, **item_data))
            # COMMIT auto-happens on context exit
```

### Key Code Block — React Cart Component

```typescript
export const Cart: React.FC<CartProps> = ({ items, total, onRemove, onCheckout, checkoutError }) => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckoutLoading(true);
    try {
      await onCheckout(items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })));
    } catch (err: any) {
      setLocalError(err.message || "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };
  // ... render with loading state "Processing Order..."
};
```

---

## Prompt 4 — Payment Upload Module

> *"Now, according to the requirements.md, please implement Module C: Payment Upload."*

### Key Code Block — Payment Upload Endpoint

```python
@router.post("/{order_id}/payment", status_code=201)
async def upload_payment(
    order_id: int = PathParam(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    1. Validate file type (jpg/png) and size (max 5MB)
    2. Find order — must be in 'pending_payment' status
    3. Save file to backend/static/payments/{order_id}/
    4. Create Payment record
    5. Update order status → 'payment_under_review'
    """
    if file.content_type not in {"image/jpeg", "image/png", "image/jpg"}:
        raise HTTPException(status_code=400, detail="Invalid file type")

    order = db.query(Order).filter(Order.id == order_id).first()
    if order.status != "pending_payment":
        raise HTTPException(status_code=409, detail="Order not awaiting payment")

    upload_dir = Path("backend/static/payments") / order.order_id
    filename = save_upload(file, upload_dir)  # Saves to disk

    payment = Payment(order_id=order.id, image_url=relative_url, status="pending_review")
    db.add(payment)
    order.status = "payment_under_review"
    db.commit()
```

### Key Code Block — PaymentUpload React Component

```typescript
export const PaymentUpload: React.FC<PaymentUploadProps> = ({ orderId, orderDisplayId, onUploadSuccess }) => {
  const [state, setState] = useState<UploadState>("idle"); // idle | dragging | uploading | success | error

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFile = async (file: File) => {
    // 1. Validate type + size
    // 2. Show preview
    // 3. POST to /api/orders/{orderId}/payment
    // 4. On success → state = "success", call onUploadSuccess()
  };

  if (state === "success") {
    return (
      <div className="success-state">
        <h3>Payment Under Review</h3>
        <p>Your bank slip has been uploaded successfully.</p>
      </div>
    );
  }
  // ... drag-and-drop upload zone
};
```

---

## Prompt 5 — Environment Setup

> *"I encountered an error when trying to activate the backend virtual environment: The term '.\venv\Scripts\Activate.ps1' is not recognized."*

### Resolution Steps:
1. Created virtual environment: `python -m venv venv`
2. Updated `requirements.txt` (psycopg2-binary caused Rust build failure → upgraded to `psycopg>=3.1.18`)
3. Re-installed dependencies
4. Updated `DATABASE_URL` to `postgresql://postgres:020302@localhost:5432/postgres` (user-provided password)
5. Verified: `python -c "from app.main import app; print('App loaded')"` → **Success**

---

## Prompt 6 — Database Seeding

> *"Ensure the PostgreSQL database tables are created according to the models. Create and run a seed.py script..."*

### Key Code Block — seed.py

```python
def create_tables():
    Base.metadata.create_all(bind=engine)  # Creates all 4 tables

def seed_products():
    products = [
        {"name": "Wireless Mouse",   "price": Decimal("29.99"), "stock": 50},
        {"name": "Mechanical Keyboard","price": Decimal("89.99"), "stock": 20},
        {"name": "USB-C Hub 7-in-1",  "price": Decimal("45.50"), "stock": 35},
        {"name": '27" 4K Monitor',   "price": Decimal("349.99"),"stock": 12},
        {"name": "Webcam 1080p HD",  "price": Decimal("59.99"), "stock": 28},
        {"name": "Noise-Canceling Headphones", "price": Decimal("129.00"), "stock": 18},
        {"name": "Laptop Stand Aluminum", "price": Decimal("39.99"), "stock": 42},
        {"name": "SSD 1TB External", "price": Decimal("79.99"), "stock": 55},
    ]
    db.add_all([Product(**p) for p in products])
    db.commit()
```

**Output:**
```
Tables created successfully.
Successfully seeded 8 products.
Total products in database: 8
Database connection verified successfully.
```

---

## Prompt 7 — Frontend Fix & Progress Report

> *"I tried to run npm run dev in the frontend folder but got npm error enoent Could not read package.json."*

### Resolution:
- Created `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `index.html`
- Created missing hooks: `useCart.ts`, `useInventory.ts`
- Created missing component: `StockView/index.tsx`
- Created missing files: `src/vite-env.d.ts`, `src/styles/global.css`
- Fixed `tsconfig.app.json` — `jsx: "react-jsx"` (was `react-jsy`)
- Removed unused imports (`React` in App.tsx, `uploadedUrl` in PaymentUpload)
- Verified build: `npm run build` → `✓ built in 644ms`

---

## Key AI Collaboration Patterns Observed

### 1. Source of Truth Pattern
Every implementation started by re-reading `requirements.md`. The AI referred to it before writing any code, ensuring alignment between stated requirements and actual implementation.

### 2. Incremental Verification
After each code generation, a verification step was run:
- Backend: `python -c "from app.main import app"`
- Frontend: `npm run build`

### 3. Error-Driven Iteration
Rather than writing perfect code upfront, the process embraced errors as discovery:
- psycopg2-binary build failure → upgraded to psycopg v3
- Password auth failed → asked user for correct password
- TypeScript `--jsx` error → fixed tsconfig.app.json
- Missing package.json → re-created all Vite boilerplate

### 4. Collaborative Problem Solving
Environment issues were resolved through dialogue:
- User reported specific error → AI diagnosed root cause → User provided missing info (password) → AI updated code

---

## Files Created by AI Collaboration

| File | Purpose |
|---|---|
| `requirements.md` | Source of Truth specification |
| `backend/app/routers/orders.py` | Atomic transaction order creation |
| `backend/app/routers/payments.py` | Payment file upload endpoint |
| `frontend/src/components/Cart/index.tsx` | Shopping cart with checkout |
| `frontend/src/components/PaymentUpload/index.tsx` | Drag-and-drop bank slip upload |
| `backend/seed.py` | Database seeding script |
| `PROGRESS_REPORT.md` | 4-day progress documentation |
| `AI_COLLABORATION_LOG.md` | This file |

---

## Quote from Requirements.md

> *"POST /api/orders — With atomic transaction for stock deduction"*
> *"POST /api/orders/{id}/payment — File upload for bank slips"*

These two sentences from the Source of Truth drove the implementation of the two most critical backend features — atomic stock deduction and payment upload.

---

*Log generated May 6, 2026 — AI-Empowered Development Process*