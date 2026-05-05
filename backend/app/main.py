import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import engine, Base
from .routers import inventory_router, orders_router
from .routers.payments import router as payments_router

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-Empowered Order & Stock Management System")

settings = get_settings()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving payment images
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Routers
app.include_router(inventory_router)
app.include_router(orders_router)
app.include_router(payments_router)


@app.get("/")
def root():
    return {"message": "AI-Empowered Order & Stock Management System"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}