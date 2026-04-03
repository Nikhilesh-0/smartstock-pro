import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

from database import get_db
from models import Product, AlertLog
from routes.auth import get_current_user, User
from config import settings

router = APIRouter(prefix="/alerts", tags=["alerts"])
logger = logging.getLogger(__name__)


def compute_suggested_order(product: Product) -> int:
    if product.eoq and product.eoq > 0:
        return int(product.eoq)
    return max(product.reorder_level * 2, 10)


def product_alert_status(product: Product) -> str:
    if product.stock < product.reorder_level * 0.25:
        return "critical"
    elif product.stock < product.reorder_level:
        return "low"
    elif product.stock > product.optimal_stock * 1.2:
        return "overstock"
    return "optimal"


def alert_item(product: Product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "category": product.category,
        "stock": product.stock,
        "reorder_level": product.reorder_level,
        "optimal_stock": product.optimal_stock,
        "eoq": product.eoq,
        "suggested_order": compute_suggested_order(product),
        "price": product.price,
        "supplier": product.supplier,
        "status": product_alert_status(product),
    }


def _get_alert_recipient() -> str:
    return getattr(settings, "ALERT_EMAIL", None) or getattr(settings, "GMAIL_USER", None) or "alerts@example.com"


@router.get("/")
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = db.query(Product).all()
    critical, low, overstock, optimal = [], [], [], []
    for p in products:
        status = product_alert_status(p)
        item = alert_item(p)
        if status == "critical":
            critical.append(item)
        elif status == "low":
            low.append(item)
        elif status == "overstock":
            overstock.append(item)
        else:
            optimal.append(item)
    return {
        "critical": critical,
        "low": low,
        "overstock": overstock,
        "optimal_count": len(optimal),
        "total_products": len(products),
    }


def build_email_html(product: Product) -> str:
    suggested = compute_suggested_order(product)
    status = product_alert_status(product)
    color = "#ef4444" if status == "critical" else "#f59e0b"
    return f"""<html><body style="font-family: Arial, sans-serif; background: #1a1208; color: #f5e6c8; padding: 32px;">
        <div style="max-width: 560px; margin: 0 auto; background: #2a1f10; border-radius: 12px; padding: 32px; border: 1px solid #3d2e1a;">
            <h1 style="margin: 0 0 4px 0; color: #f59e0b; font-size: 22px;">📦 SmartStock Pro</h1>
            <p style="margin: 0 0 20px 0; color: #9a8060; font-size: 14px;">Stock Alert Notification</p>
            <div style="background: {color}22; border: 1px solid {color}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: {color};">⚠️ {status.upper()} STOCK ALERT</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px 0; color: #9a8060; width: 140px;">Product</td><td style="padding: 8px 0; color: #f5e6c8;"><strong>{product.name}</strong></td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">SKU</td><td style="padding: 8px 0; color: #f5e6c8;">{product.sku}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Current Stock</td><td style="padding: 8px 0; color: {color};"><strong>{product.stock} units</strong></td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Reorder Level</td><td style="padding: 8px 0; color: #f5e6c8;">{product.reorder_level} units</td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Suggested Order</td><td style="padding: 8px 0; color: #22c55e;"><strong>{suggested} units</strong></td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Estimated Cost</td><td style="padding: 8px 0; color: #f5e6c8;">${product.price * suggested:,.2f}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Supplier</td><td style="padding: 8px 0; color: #f5e6c8;">{product.supplier or "—"}</td></tr>
            </table>
            <p style="margin: 0; color: #9a8060; font-size: 13px; border-top: 1px solid #3d2e1a; padding-top: 16px;">
                Automated alert from SmartStock Pro.
            </p>
        </div></body></html>"""


async def _send_resend(subject: str, html_body: str) -> None:
    api_key = getattr(settings, "RESEND_API_KEY", None)
    if not api_key:
        raise ValueError("RESEND_API_KEY is not set in Railway environment variables")

    recipient = _get_alert_recipient()
    sender = getattr(settings, "RESEND_FROM", None) or "SmartStock Pro <onboarding@resend.dev>"

    logger.info(f"Resend: sending to={recipient} subject={subject!r}")

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": sender, "to": [recipient], "subject": subject, "html": html_body},
        )

    if response.status_code == 401:
        raise ValueError("Resend API key is invalid or expired — check RESEND_API_KEY in Railway")
    if response.status_code == 422:
        raise ValueError(f"Resend rejected the request: {response.json()}")
    if not response.is_success:
        raise ValueError(f"Resend API error {response.status_code}: {response.text}")

    logger.info(f"Resend: sent successfully | id={response.json().get('id')}")


def send_alert_email_internal(product_id: int, db: Session) -> bool:
    """Sync wrapper for use from sync sales routes. Never raises."""
    import asyncio
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return False
        if not getattr(settings, "RESEND_API_KEY", None):
            logger.warning("RESEND_API_KEY not set — skipping auto alert")
            return False

        status = product_alert_status(product)
        subject = f"[SmartStock Pro] {status.upper()} Stock Alert: {product.name}"
        asyncio.run(_send_resend(subject, build_email_html(product)))

        log = AlertLog(
            product_id=product_id,
            alert_type=status,
            message=f"Auto alert (Resend): {product.name} stock={product.stock}",
            email_sent=True,
        )
        db.add(log)
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Auto alert failed: {type(e).__name__}: {e}")
        return False


@router.post("/send-email/{product_id}")
async def send_email_alert(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not getattr(settings, "RESEND_API_KEY", None):
        raise HTTPException(
            status_code=503,
            detail="Email not configured. Add RESEND_API_KEY to Railway environment variables.",
        )

    try:
        status = product_alert_status(product)
        subject = f"[SmartStock Pro] {status.upper()} Stock Alert: {product.name}"
        await _send_resend(subject, build_email_html(product))

        log = AlertLog(
            product_id=product_id,
            alert_type=status,
            message=f"Manual alert by {current_user.email}: {product.name} stock={product.stock}",
            email_sent=True,
        )
        db.add(log)
        db.commit()

        return {
            "message": f"Alert email sent for {product.name}",
            "sent_to": _get_alert_recipient(),
            "provider": "Resend",
        }

    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Manual alert failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")