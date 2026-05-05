from .inventory import router as inventory_router
from .orders import router as orders_router
from .payments import router as payments_router

__all__ = ["inventory_router", "orders_router", "payments_router"]