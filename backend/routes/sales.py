from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Product, Sale, Refund
from routes.auth import get_current_user, User

router = APIRouter(prefix="/sales", tags=["sales"])


class SaleRequest(BaseModel):
    product_id: int
    quantity: int
    notes: Optional[str] = None


class RefundRequest(BaseModel):
    reason: Optional[str] = None


def sale_to_dict(sale: Sale, product: Product = None) -> dict:
    p = product or sale.product
    return {
        "sale_id": sale.sale_id,
        "product_id": sale.product_id,
        "product_name": p.name if p else "Unknown",
        "sku": p.sku if p else "N/A",
        "quantity": sale.quantity,
        "total_amount": sale.total_amount,
        "sale_time": sale.sale_time,
        "day_of_week": sale.day_of_week,
        "hour_of_day": sale.hour_of_day,
        "notes": sale.notes,
        "refunded": sale.refund is not None,
    }


@router.post("/record")
def record_sale(
    req: SaleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        product = db.query(Product).filter(Product.id == req.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < req.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {product.stock}, Requested: {req.quantity}",
            )

        now = datetime.utcnow()
        total_amount = product.price * req.quantity

        product.stock -= req.quantity

        from routes.inventory import compute_status
        product.status = compute_status(product.stock, product.reorder_level, product.optimal_stock)
        product.updated_at = now

        sale = Sale(
            product_id=req.product_id,
            quantity=req.quantity,
            total_amount=total_amount,
            sale_time=now,
            day_of_week=now.strftime("%A"),
            hour_of_day=now.hour,
            notes=req.notes,
        )
        db.add(sale)
        db.commit()
        db.refresh(sale)
        db.refresh(product)

        alert_triggered = None
        if product.status == "critical":
            alert_triggered = f"CRITICAL: {product.name} stock is now {product.stock} (below critical threshold)"
            _auto_alert(product.id, db)
        elif product.status == "low":
            alert_triggered = f"LOW STOCK: {product.name} stock is now {product.stock} (below reorder level)"

        return {
            "sale_id": sale.sale_id,
            "product_name": product.name,
            "sku": product.sku,
            "quantity": req.quantity,
            "total_amount": total_amount,
            "remaining_stock": product.stock,
            "product_status": product.status,
            "alert_triggered": alert_triggered,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sale failed: {str(e)}")


def _auto_alert(product_id: int, db: Session):
    """Internal: called after sale if stock becomes critical."""
    try:
        from routes.alerts import send_alert_email_internal
        send_alert_email_internal(product_id, db)
    except Exception:
        pass


@router.get("/history")
def get_sales_history(
    limit: Optional[int] = Query(100),
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Sale)
    if product_id:
        query = query.filter(Sale.product_id == product_id)
    sales = query.order_by(Sale.sale_time.desc()).limit(limit).all()
    return [sale_to_dict(s) for s in sales]


@router.post("/refund/{sale_id}")
def process_refund(
    sale_id: int,
    req: RefundRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
        if not sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        if sale.refund:
            raise HTTPException(status_code=400, detail="Sale already refunded")

        product = db.query(Product).filter(Product.id == sale.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        product.stock += sale.quantity

        from routes.inventory import compute_status
        product.status = compute_status(product.stock, product.reorder_level, product.optimal_stock)
        product.updated_at = datetime.utcnow()

        refund = Refund(
            sale_id=sale_id,
            product_id=sale.product_id,
            quantity=sale.quantity,
            refund_amount=sale.total_amount,
            reason=req.reason,
        )
        db.add(refund)
        db.commit()
        db.refresh(refund)

        return {
            "refund_id": refund.id,
            "sale_id": sale_id,
            "product_name": product.name,
            "quantity_returned": sale.quantity,
            "refund_amount": refund.refund_amount,
            "new_stock": product.stock,
            "message": "Refund processed successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Refund failed: {str(e)}")


@router.get("/trends/day-of-week")
def day_of_week_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    results = (
        db.query(Sale.day_of_week, func.count(Sale.sale_id), func.sum(Sale.total_amount))
        .group_by(Sale.day_of_week)
        .all()
    )
    data_map = {row[0]: {"count": row[1], "revenue": float(row[2] or 0)} for row in results}
    return [
        {
            "day": day,
            "count": data_map.get(day, {}).get("count", 0),
            "revenue": data_map.get(day, {}).get("revenue", 0.0),
        }
        for day in days_order
    ]


@router.get("/trends/hourly")
def hourly_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = (
        db.query(Sale.hour_of_day, func.count(Sale.sale_id), func.sum(Sale.total_amount))
        .group_by(Sale.hour_of_day)
        .order_by(Sale.hour_of_day)
        .all()
    )
    hour_map = {row[0]: {"count": row[1], "revenue": float(row[2] or 0)} for row in results}
    return [
        {
            "hour": h,
            "label": f"{h:02d}:00",
            "count": hour_map.get(h, {}).get("count", 0),
            "revenue": hour_map.get(h, {}).get("revenue", 0.0),
        }
        for h in range(24)
    ]
