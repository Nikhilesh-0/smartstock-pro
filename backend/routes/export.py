import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Product, Sale
from routes.auth import get_current_user, User

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/inventory")
def export_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = db.query(Product).order_by(Product.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Name", "SKU", "Category", "Price", "Supplier",
        "Stock", "Reorder Level", "Optimal Stock", "EOQ", "Status",
        "Created At", "Updated At"
    ])
    for p in products:
        writer.writerow([
            p.id, p.name, p.sku, p.category or "", f"{p.price:.2f}",
            p.supplier or "", p.stock, p.reorder_level, p.optimal_stock,
            f"{p.eoq:.2f}", p.status,
            p.created_at.strftime("%Y-%m-%d %H:%M:%S") if p.created_at else "",
            p.updated_at.strftime("%Y-%m-%d %H:%M:%S") if p.updated_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smartstock_inventory.csv"},
    )


@router.get("/sales")
def export_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sales = db.query(Sale).order_by(Sale.sale_time.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Sale ID", "Product", "SKU", "Quantity", "Total Amount",
        "Date", "Day of Week", "Hour", "Notes", "Refunded"
    ])
    for s in sales:
        writer.writerow([
            s.sale_id,
            s.product.name if s.product else "Unknown",
            s.product.sku if s.product else "N/A",
            s.quantity,
            f"{s.total_amount:.2f}",
            s.sale_time.strftime("%Y-%m-%d %H:%M:%S") if s.sale_time else "",
            s.day_of_week or "",
            s.hour_of_day if s.hour_of_day is not None else "",
            s.notes or "",
            "Yes" if s.refund else "No",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smartstock_sales.csv"},
    )
