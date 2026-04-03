import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #1a1208; color: #f5e6c8; padding: 32px;">
        <div style="max-width: 560px; margin: 0 auto; background: #2a1f10; border-radius: 12px; padding: 32px; border: 1px solid #3d2e1a;">
            <div style="display: flex; align-items: center; margin-bottom: 24px;">
                <span style="font-size: 28px; margin-right: 12px;">📦</span>
                <div>
                    <h1 style="margin: 0; color: #f59e0b; font-size: 22px;">SmartStock Pro</h1>
                    <p style="margin: 0; color: #9a8060; font-size: 14px;">Stock Alert Notification</p>
                </div>
            </div>
            <div style="background: {color}22; border: 1px solid {color}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: {color};">
                    ⚠️ {status.upper()} STOCK ALERT
                </p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px 0; color: #9a8060;">Product</td><td style="padding: 8px 0; color: #f5e6c8;"><strong>{product.name}</strong></td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">SKU</td><td style="padding: 8px 0; color: #f5e6c8;">{product.sku}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Current Stock</td><td style="padding: 8px 0; color: {color};"><strong>{product.stock} units</strong></td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Reorder Level</td><td style="padding: 8px 0; color: #f5e6c8;">{product.reorder_level} units</td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Suggested Order</td><td style="padding: 8px 0; color: #22c55e;"><strong>{suggested} units</strong></td></tr>
                <tr><td style="padding: 8px 0; color: #9a8060;">Estimated Cost</td><td style="padding: 8px 0; color: #f5e6c8;">${product.price * suggested:,.2f}</td></tr>
            </table>
            <p style="margin: 0; color: #9a8060; font-size: 13px; border-top: 1px solid #3d2e1a; padding-top: 16px;">
                This is an automated alert from SmartStock Pro. Please review your inventory levels and place a purchase order if needed.
            </p>
        </div>
    </body>
    </html>
    """


def send_alert_email_internal(product_id: int, db: Session) -> bool:
    """Internal function called automatically after sales."""
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return False

        if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
            logger.warning("Email credentials not configured, skipping alert email")
            return False

        status = product_alert_status(product)
        html_content = build_email_html(product)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[SmartStock Pro] {status.upper()} Stock Alert: {product.name}"
        msg["From"] = settings.GMAIL_USER
        msg["To"] = settings.GMAIL_USER
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            smtp.send_message(msg)

        log = AlertLog(
            product_id=product_id,
            alert_type=status,
            message=f"Auto alert: {product.name} stock at {product.stock}",
            email_sent=True,
        )
        db.add(log)
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to send alert email: {e}")
        return False


@router.post("/send-email/{product_id}")
def send_email_alert(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
        raise HTTPException(
            status_code=503,
            detail="Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.",
        )

    try:
        status = product_alert_status(product)
        html_content = build_email_html(product)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[SmartStock Pro] {status.upper()} Stock Alert: {product.name}"
        msg["From"] = settings.GMAIL_USER
        msg["To"] = settings.GMAIL_USER
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            smtp.send_message(msg)

        log = AlertLog(
            product_id=product_id,
            alert_type=status,
            message=f"Manual alert: {product.name} stock at {product.stock}",
            email_sent=True,
        )
        db.add(log)
        db.commit()

        return {"message": f"Alert email sent successfully for {product.name}", "email": settings.GMAIL_USER}
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=401, detail="Gmail authentication failed. Check your app password.")
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
