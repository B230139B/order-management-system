"""
Seed script: Creates tables and inserts sample products into PostgreSQL.
Run with: python seed.py
"""

from decimal import Decimal

from app.database import engine, Base, SessionLocal
from app.models import Product, Order, OrderItem, Payment  # noqa: F401 - needed for table creation


def create_tables():
    """Create all tables defined by SQLAlchemy models."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")


def seed_products():
    """Insert 5 sample products with stock balances."""
    products = [
        {
            "name": "Wireless Mouse",
            "price": Decimal("29.99"),
            "stock": 50,
        },
        {
            "name": "Mechanical Keyboard",
            "price": Decimal("89.99"),
            "stock": 20,
        },
        {
            "name": "USB-C Hub 7-in-1",
            "price": Decimal("45.50"),
            "stock": 35,
        },
        {
            "name": "27\" 4K Monitor",
            "price": Decimal("349.99"),
            "stock": 12,
        },
        {
            "name": "Webcam 1080p HD",
            "price": Decimal("59.99"),
            "stock": 28,
        },
        {
            "name": "Noise-Canceling Headphones",
            "price": Decimal("129.00"),
            "stock": 18,
        },
        {
            "name": "Laptop Stand Aluminum",
            "price": Decimal("39.99"),
            "stock": 42,
        },
        {
            "name": "SSD 1TB External",
            "price": Decimal("79.99"),
            "stock": 55,
        },
    ]

    db = SessionLocal()
    try:
        # Check if products already exist
        existing = db.query(Product).count()
        if existing > 0:
            print(f"Database already has {existing} products. Skipping seed.")
            return

        print("Inserting sample products...")
        for p in products:
            product = Product(**p)
            db.add(product)

        db.commit()
        print(f"Successfully seeded {len(products)} products.")

        # Verify
        count = db.query(Product).count()
        print(f"Total products in database: {count}")

        # Print all products
        print("\n--- Current Inventory ---")
        for p in db.query(Product).order_by(Product.id).all():
            print(f"  [{p.id}] {p.name} | ${p.price} | Stock: {p.stock}")

    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 50)
    print("Database Seeding Script")
    print("=" * 50)

    create_tables()
    seed_products()

    print("\nDatabase connection verified successfully.")
    print("=" * 50)