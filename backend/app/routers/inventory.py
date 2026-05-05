from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.product import Product
from ..schemas.product import ProductResponse

router = APIRouter(prefix="/api", tags=["inventory"])


@router.get("/inventory", response_model=List[ProductResponse])
def get_inventory(db: Session = Depends(get_db)):
    """Retrieve real-time stock levels for all products."""
    products = db.query(Product).order_by(Product.id).all()
    return products


@router.get("/products", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    """List all products."""
    products = db.query(Product).all()
    return products