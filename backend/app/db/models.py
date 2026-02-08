from enum import Enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class ProductType(str, Enum):
    LUONG_1 = "1 lượng"
    LUONG_5 = "5 lượng"
    KG_1 = "1 kg"

class ProductStatus(str, Enum):
    AVAILABLE = "available"
    SOLD = "sold"
    IN_TRANSIT = "in_transit"

class TransactionType(str, Enum):
    SALE = "sale"          # Money In (Staff -> Customer)
    BUYBACK = "buyback"    # Money Out (Customer -> Staff)
    MANUFACTURER = "mfr"   # Money Out (Staff -> Ancarat)
    FULFILLMENT = "fulfill"# Handover (Price 0)

class Store(Base):
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    location = Column(String)
    phone_number = Column(String)
    is_active = Column(Boolean, default=True)

    # Relationships
    products = relationship("Product", back_populates="store")
    transactions = relationship("Transaction", back_populates="store")

class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True, index=True)
    staff_name = Column(String, nullable=False)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String) # e.g., "admin", "staff_A"
    
    transactions = relationship("Transaction", back_populates="staff")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cccd = Column(String, unique=True) # Vietnamese Citizen ID
    phone_number = Column(String, index=True)
    address = Column(String, nullable=True)

    transactions = relationship("Transaction", back_populates="customer")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    product_type = Column(String) # e.g., ProductType.LUONG_5
    status = Column(String, default=ProductStatus.AVAILABLE)
    last_price = Column(Float)
    store_id = Column(Integer, ForeignKey("stores.id"))
    
    store = relationship("Store", back_populates="products")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    type = Column(String) # TransactionType
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    staff_id = Column(Integer, ForeignKey("staff.id"))
    store_id = Column(Integer, ForeignKey("stores.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Self-referencing key for Buybacks or Fulfillments
    linked_transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    
    # Relationships
    items = relationship("TransactionItem", back_populates="transaction")
    staff = relationship("Staff", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    store = relationship("Store", back_populates="transactions")
    linked_to = relationship("Transaction", remote_side=[id])

class TransactionItem(Base):
    """Junction table recording the price of each item at the time of order."""
    __tablename__ = "transaction_items"
    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    price_at_time = Column(Float) # Crucial for P&L math
    
    transaction = relationship("Transaction", back_populates="items")
    product = relationship("Product")
