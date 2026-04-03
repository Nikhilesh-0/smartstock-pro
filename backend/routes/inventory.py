import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Product, Sale
from routes.auth import get_current_user, User

router = APIRouter(prefix="/inventory", tags=["inventory"])

ORDERING_COST = 50.0
HOLDING_COST_RATE = 0.2


def calculate_eoq(price: float, annual_demand: float = 1000.0) -> float:
    holding_cost = price * HOLDING_COST_RATE
    if holding_cost <= 0:
        return 0.0
    return round(math.sqrt((2 * annual_demand * ORDERING_COST) / holding_cost), 2)


def compute_status(stock: int, reorder_level: int, optimal_stock: int) -> str:
    if stock < reorder_level * 0.25:
        return "critical"
    elif stock < reorder_level:
        return "low"
    elif stock > optimal_stock * 1.2:
        return "overstock"
    else:
        return "optimal"


class ProductCreate(BaseModel):
    name: str
    sku: str
    category: Optional[str] = None
    price: float = 0.0
    supplier: Optional[str] = None
    stock: int = 0
    reorder_level: int = 10
    optimal_stock: int = 100


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    supplier: Optional[str] = None
    stock: Optional[int] = None
    reorder_level: Optional[int] = None
    optimal_stock: Optional[int] = None


def product_to_dict(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "sku": p.sku,
        "category": p.category,
        "price": p.price,
        "supplier": p.supplier,
        "stock": p.stock,
        "reorder_level": p.reorder_level,
        "optimal_stock": p.optimal_stock,
        "eoq": p.eoq,
        "status": p.status,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.get("/products")
def get_products(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Product)
    if status:
        query = query.filter(Product.status == status)
    if category:
        query = query.filter(Product.category == category)
    if search:
        query = query.filter(
            Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%")
        )
    products = query.order_by(Product.created_at.desc()).all()
    return [product_to_dict(p) for p in products]


@router.post("/products")
def create_product(
    req: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Product).filter(Product.sku == req.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    eoq = calculate_eoq(req.price)
    status = compute_status(req.stock, req.reorder_level, req.optimal_stock)

    product = Product(
        name=req.name,
        sku=req.sku,
        category=req.category,
        price=req.price,
        supplier=req.supplier,
        stock=req.stock,
        reorder_level=req.reorder_level,
        optimal_stock=req.optimal_stock,
        eoq=eoq,
        status=status,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_to_dict(product)


@router.put("/products/{product_id}")
def update_product(
    product_id: int,
    req: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if req.name is not None:
        product.name = req.name
    if req.sku is not None:
        product.sku = req.sku
    if req.category is not None:
        product.category = req.category
    if req.price is not None:
        product.price = req.price
        product.eoq = calculate_eoq(req.price)
    if req.supplier is not None:
        product.supplier = req.supplier
    if req.stock is not None:
        product.stock = req.stock
    if req.reorder_level is not None:
        product.reorder_level = req.reorder_level
    if req.optimal_stock is not None:
        product.optimal_stock = req.optimal_stock

    product.status = compute_status(product.stock, product.reorder_level, product.optimal_stock)
    product.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(product)
    return product_to_dict(product)


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = db.query(Product).all()
    total_skus = len(products)
    stock_value = sum(p.price * p.stock for p in products)
    low_alerts = sum(1 for p in products if p.status in ["critical", "low"])
    total_revenue = db.query(func.sum(Sale.total_amount)).scalar() or 0.0

    return {
        "total_skus": total_skus,
        "stock_value": round(stock_value, 2),
        "low_alerts": low_alerts,
        "total_revenue": round(total_revenue, 2),
        "total_products": total_skus,
    }
