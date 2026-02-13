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
    AVAILABLE = "Có sẵn"
    SOLD = "Đã bán"
    IN_TRANSIT = "Đang vận chuyển"
    ORDERED = "Đã đặt hàng"
    FULFILLED = "Đã giao"  # Product fulfilled/delivered to customer
    SOLD_BACK_MFR = "Đã bán lại NSX"  # Product sold back to manufacturer
    RECEIVED_FROM_MFR = "Đã nhận hàng NSX"  # Product received from manufacturer

class TransactionType(str, Enum):
    SALE = "Đơn cọc"            # Money In (Staff -> Customer)
    BUYBACK = "Mua lại"         # Money Out (Customer -> Staff)
    MANUFACTURER = "Đặt hàng NSX"  # Money Out (Staff -> Ancarat)
    FULFILLMENT = "Giao hàng"   # Handover (Price 0)
    SELL_BACK_MFR = "Bán lại NSX"       # Sell back to manufacturer
    MANUFACTURER_RECEIVED = "Nhận hàng NSX"  # Receive from manufacturer
    SWAP = "Hoán đổi"           # Swap products between customers/inventory

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
    is_ordered = Column(Boolean, default=False)  # True when ordered from manufacturer
    is_delivered = Column(Boolean, default=False)  # True when delivered from manufacturer
    
    store = relationship("Store", back_populates="products")

    transactions = relationship(
        "Transaction",
        secondary="transaction_items",
        primaryjoin="Product.id == TransactionItem.product_id",
        secondaryjoin="Transaction.id == TransactionItem.transaction_id",
        back_populates="product_items",
        viewonly=True
    )

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    type = Column(String) # TransactionType
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    staff_id = Column(Integer, ForeignKey("staff.id"))
    store_id = Column(Integer, ForeignKey("stores.id"))
    created_at = Column(DateTime, default=datetime.now)
    
    # Self-referencing key for Buybacks or Fulfillments
    linked_transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    
    # Relationships
    items = relationship("TransactionItem", back_populates="transaction")
    staff = relationship("Staff", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    store = relationship("Store", back_populates="transactions")
    linked_to = relationship("Transaction", remote_side=[id])

    payment_method = Column(String, nullable=True)
    code = Column(String, nullable=True) # Manufacturer manual code
    transaction_code = Column(String, nullable=True, unique=True) # Auto-generated system code
    
    product_items = relationship(
        "Product",
        secondary="transaction_items",
        primaryjoin="Transaction.id == TransactionItem.transaction_id",
        secondaryjoin="Product.id == TransactionItem.product_id",
        back_populates="transactions",
        viewonly=True
    )

class TransactionItem(Base):
    """Junction table recording the price of each item at the time of order."""
    __tablename__ = "transaction_items"
    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    price_at_time = Column(Float) # Crucial for P&L math

    # Swap tracking: when a product is swapped, we update product_id to the new product
    # and record the original product_id here for audit trail
    swapped = Column(Boolean, default=False)
    original_product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    transaction = relationship("Transaction", back_populates="items")
    product = relationship("Product", foreign_keys=[product_id])
    original_product = relationship("Product", foreign_keys=[original_product_id])
