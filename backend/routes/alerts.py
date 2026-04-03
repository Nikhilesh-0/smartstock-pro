import smtplib
import logging
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# ── IPv4 FORCE PATCH ──────────────────────────────────────────────────────────
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only_getaddrinfo(*args, **kwargs):
    results = _orig_getaddrinfo(*args, **kwargs)
    ipv4 = [r for r in results if r[0] == socket.AF_INET]
    return ipv4 if ipv4 else results
socket.getaddrinfo = _ipv4_only_getaddrinfo
# ─────────────────────────────────────────────────────────────────────────────

from database import get_db
from models import Product, AlertLog
from routes.auth import get_current_user, User
from config import settings

router = APIRouter(prefix="/alerts", tags=["alerts"])
logger = logging.getLogger(__name__)


# ── HELPERS ───────────────────────────────────────────────────────────────────

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
    return getattr(settings, "ALERT_EMAIL", None) or settings.GMAIL_USER


# ── GET ALERTS ────────────────────────────────────────────────────────────────

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


# ── EMAIL BUILDER ─────────────────────────────────────────────────────────────

def build_email_html(product: Product) -> str:
    suggested = compute_suggested_order(product)
    status = product_alert_status(product)
    color = "#ef4444" if status == "critical" else "#f59e0b"
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #1a1208; color: #f5e6c8; padding: 32px;">
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
        </div>
    </body>
    </html>
    """


# ── CORE SMTP SEND ────────────────────────────────────────────────────────────

def _build_message(subject: str, html_body: str) -> MIMEMultipart:
    recipient = _get_alert_recipient()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.GMAIL_USER
    msg["To"] = recipient
    msg.attach(MIMEText(html_body, "html"))
    return msg


def _try_port_587(msg: MIMEMultipart) -> None:
    """STARTTLS on port 587."""
    logger.info("SMTP attempt: smtp.gmail.com:587 STARTTLS")
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        smtp.send_message(msg)


def _try_port_465(msg: MIMEMultipart) -> None:
    """SSL on port 465."""
    logger.info("SMTP attempt: smtp.gmail.com:465 SSL")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as smtp:
        smtp.ehlo()
        smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        smtp.send_message(msg)


def _try_port_2525(msg: MIMEMultipart) -> None:
    """STARTTLS on port 2525 (some hosts block 587, not 2525)."""
    logger.info("SMTP attempt: smtp.gmail.com:2525 STARTTLS")
    with smtplib.SMTP("smtp.gmail.com", 2525, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        smtp.send_message(msg)


def _send_smtp(subject: str, html_body: str) -> str:
    """
    Tries ports 587 → 465 → 2525 in order.
    Returns the port string that succeeded.
    Raises the last exception if all three fail.
    """
    msg = _build_message(subject, html_body)
    recipient = _get_alert_recipient()
    logger.info(f"Sending alert | from={settings.GMAIL_USER} to={recipient}")

    attempts = [
        ("587 (STARTTLS)", _try_port_587),
        ("465 (SSL)",      _try_port_465),
        ("2525 (STARTTLS)",_try_port_2525),
    ]

    last_error = None
    for label, fn in attempts:
        try:
            # Rebuild message each attempt — MIME objects can only be sent once
            msg = _build_message(subject, html_body)
            fn(msg)
            logger.info(f"Email sent successfully via port {label}")
            return label
        except smtplib.SMTPAuthenticationError:
            # Auth failure is definitive — no point trying other ports
            raise
        except Exception as e:
            logger.warning(f"Port {label} failed: {type(e).__name__}: {e}")
            last_error = e

    raise last_error


# ── INTERNAL AUTO-ALERT ───────────────────────────────────────────────────────

def send_alert_email_internal(product_id: int, db: Session) -> bool:
    """Called from sales.py after stock deduction. Never raises — sale must not fail."""
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return False
        if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
            logger.warning("Email credentials not set — skipping auto alert")
            return False

        status = product_alert_status(product)
        subject = f"[SmartStock Pro] {status.upper()} Stock Alert: {product.name}"
        port_used = _send_smtp(subject, build_email_html(product))

        log = AlertLog(
            product_id=product_id,
            alert_type=status,
            message=f"Auto alert via {port_used}: {product.name} stock={product.stock}",
            email_sent=True,
        )
        db.add(log)
        db.commit()
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error("Auto alert: Gmail auth failed — regenerate App Password in Railway vars")
        return False
    except Exception as e:
        logger.error(f"Auto alert failed (all ports): {type(e).__name__}: {e}")
        return False


# ── MANUAL ALERT ENDPOINT ─────────────────────────────────────────────────────

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
            detail="Email not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD in Railway environment variables.",
        )

    try:
        status = product_alert_status(product)
        subject = f"[SmartStock Pro] {status.upper()} Stock Alert: {product.name}"
        port_used = _send_smtp(subject, build_email_html(product))

        log = AlertLog(
            product_id=product_id,
            alert_type=status,
            message=f"Manual alert by {current_user.email} via {port_used}: {product.name} stock={product.stock}",
            email_sent=True,
        )
        db.add(log)
        db.commit()

        recipient = _get_alert_recipient()
        return {
            "message": f"Alert email sent for {product.name}",
            "sent_to": recipient,
            "port_used": port_used,
        }

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=401,
            detail=(
                "Gmail authentication failed. Your App Password is wrong or expired. "
                "Go to myaccount.google.com → Security → App Passwords, delete the old one, "
                "generate a new 16-char password, and update GMAIL_APP_PASSWORD in Railway."
            ),
        )
    except Exception as e:
        logger.error(f"Manual alert: all ports failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=503,
            detail=(
                f"All SMTP ports (587, 465, 2525) timed out: {e}. "
                "Railway may be blocking outbound SMTP. Consider switching to SendGrid or Resend "
                "(see README for instructions)."
            ),
        )