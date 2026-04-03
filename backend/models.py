from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="staff")  # admin / staff
    company = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(100), nullable=True)
    price = Column(Float, default=0.0)
    supplier = Column(String(255), nullable=True)
    stock = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    optimal_stock = Column(Integer, default=100)
    eoq = Column(Float, default=0.0)
    status = Column(String(50), default="optimal")  # critical / low / optimal / overstock
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sales = relationship("Sale", back_populates="product")
    alerts = relationship("AlertLog", back_populates="product")
    purchase_orders = relationship("PurchaseOrder", back_populates="product")


class Sale(Base):
    __tablename__ = "sales"

    sale_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)
    sale_time = Column(DateTime(timezone=True), server_default=func.now())
    day_of_week = Column(String(20), nullable=True)  # Monday, Tuesday, etc.
    hour_of_day = Column(Integer, nullable=True)  # 0-23
    notes = Column(Text, nullable=True)

    product = relationship("Product", back_populates="sales")
    refund = relationship("Refund", back_populates="sale", uselist=False)


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.sale_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    refund_amount = Column(Float, nullable=False)
    reason = Column(Text, nullable=True)
    refunded_at = Column(DateTime(timezone=True), server_default=func.now())

    sale = relationship("Sale", back_populates="refund")


class AlertLog(Base):
    __tablename__ = "alerts_log"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # critical / low / overstock
    message = Column(Text, nullable=True)
    email_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="alerts")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    estimated_cost = Column(Float, nullable=False)
    status = Column(String(50), default="pending")  # pending / ordered / received
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="purchase_orders")
