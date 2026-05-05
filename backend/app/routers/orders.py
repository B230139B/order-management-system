from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from decimal import Decimal
import random
import string
from datetime import datetime

from ..database import get_db
from ..models.product import Product
from ..models.order import Order, OrderItem
from ..schemas.order import OrderCreate, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])


def generate_order_id() -> str:
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"ORD-{date_part}-{random_part}"


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    """
    Create a new order with ATOMIC transaction for stock deduction.

    Flow:
    1. BEGIN transaction
    2. Lock product rows (SELECT FOR UPDATE) to prevent race conditions
    3. Validate all products exist and have sufficient stock
    4. Deduct stock for all items
    5. Create order + order_items
    6. COMMIT

    If any check fails -> ROLLBACK entire transaction
    """
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    try:
        # Start atomic transaction
        with db.begin():
            total = Decimal("0")
            order_items_data = []

            # Lock and validate all products in one pass
            product_ids = [item.product_id for item in order_data.items]
            products = (
                db.query(Product)
                .filter(Product.id.in_(product_ids))
                .with_for_update()
                .all()
            )

            if len(products) != len(product_ids):
                found_ids = {p.id for p in products}
                missing = [pid for pid in product_ids if pid not in found_ids]
                raise HTTPException(
                    status_code=404,
                    detail=f"Products not found: {missing}",
                )

            # Build lookup map
            product_map = {p.id: p for p in products}

            # Validate stock for each item
            for item in order_data.items:
                product = product_map[item.product_id]

                if product.stock < item.quantity:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Insufficient stock for product: {product.name} "
                               f"(requested: {item.quantity}, available: {product.stock})",
                    )

                item_total = product.price * item.quantity
                total += item_total

                order_items_data.append(
                    {
                        "product_id": product.id,
                        "quantity": item.quantity,
                        "unit_price": product.price,
                    }
                )

            # All checks passed — deduct stock
            for item in order_data.items:
                product = product_map[item.product_id]
                product.stock -= item.quantity

            # Create order
            order = Order(
                order_id=generate_order_id(),
                total=total,
                status="pending_payment",
            )
            db.add(order)
            db.flush()  # Get order.id before adding items

            # Create order items
            created_items = []
            for item_data in order_items_data:
                order_item = OrderItem(order_id=order.id, **item_data)
                db.add(order_item)
                created_items.append(
                    OrderItemResponse(
                        id=0,  # Will be set after flush
                        product_id=item_data["product_id"],
                        quantity=item_data["quantity"],
                        unit_price=item_data["unit_price"],
                    )
                )

            # Commit happens automatically on context manager exit

        # Refresh to get DB-generated fields
        db.refresh(order)

        return OrderResponse(
            id=order.id,
            order_id=order.order_id,
            total=order.total,
            status=order.status,
            items=created_items,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")


@router.get("", response_model=List[OrderResponse])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order