from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    status = Column(String(50), default="pending_review")
    uploaded_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="payments")