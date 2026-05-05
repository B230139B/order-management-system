import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Path as PathParam
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.order import Order
from ..models.payment import Payment

router = APIRouter(prefix="/api/orders", tags=["payments"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def save_upload(file: UploadFile, dest_dir: Path) -> str:
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"bank_slip_{uuid.uuid4().hex[:8]}{ext}"
    file_path = dest_dir / filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return filename


@router.post("/{order_id}/payment", status_code=201)
async def upload_payment(
    order_id: int = PathParam(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a bank slip / receipt image for an order.

    1. Validate file type (jpg, png) and size (max 5MB)
    2. Find order and verify it's in 'pending_payment' status
    3. Save file to backend/static/payments/{order_id}/
    4. Create Payment record with image_url
    5. Update order status to 'payment_under_review'
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: jpg, png",
        )

    # Validate order exists
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Verify order is awaiting payment
    if order.status != "pending_payment":
        raise HTTPException(
            status_code=409,
            detail=f"Order is not in 'pending_payment' state. Current: '{order.status}'",
        )

    # Save file
    upload_dir = Path("backend/static/payments") / order.order_id
    filename = save_upload(file, upload_dir)
    relative_url = f"/static/payments/{order.order_id}/{filename}"

    # Create payment record
    payment = Payment(
        order_id=order.id,
        image_url=relative_url,
        status="pending_review",
    )
    db.add(payment)

    # Update order status
    order.status = "payment_under_review"
    db.commit()

    return {
        "message": "Payment uploaded successfully",
        "image_url": relative_url,
        "order_id": order.order_id,
        "status": order.status,
    }