Business logic/ operation flow: 
    - When staff creates an order/transaction for a customer who wants to buy silver bullions types: 1 lượng, 5 lượng, 1 kg with price, if the staff see no available product_id in store, then the staff will create the products in product table to use in the transaction. The staff has an option to either pick available stock with last_price or create new products. For example, staff_A creates an order_1 for customer_A: 3* 1 lượng (at price 3,400,000 vnd) & 1* 5 lượng (at price 17,000,000 vnd) & 1* 1kg (at price 82,000,000 vnd) in store HT, time 09:15:00 30/01/2026, the staff will create 5 product_id (3 for each 1 lượng, 1 for 5 lượng and 1 for 1kg) with status sold. 

    - Then staff_admin creates an order_A1 to the silver manufacturer (Ancarat), it contains 6 product_id (5 product_id from order_1 and one extra product 5 lượng) with price. The extra product 1* 5 lượng will have 'available' status, product_id in product table and assigned to one of stores. 

    - After that, when the customer_A sells the order_1 back to the store, the staff_A creates another transation that has linked to order_1 with 5 product_id in order_1 and new price, date, time, store, status of transaction: sold. Then 5 product_id have status: available.

    - Another customer_B wants to buy 1*5 lượng, then the staff create a transaction order_2 by selecting the extra 1* 5 lượng with 'available' status. After the transaction is created, then the status of extra 1* 5 lượng changes to 'sold'.

    - When the store HT receives 1*5 lượng from the Ancarat manufacturer, the staff fulfilled the order_2 for the customer. The staff selects the order_2, the app will create another transaction with product_id with price zero, store, date, time and status 'fulfilled' and field linked_to_transaction is 2.

    - When customer_B wants to buy more 2* 1 lượng (at price 2,500,000 vnd) in store_HT, then the staff selects 1* 1 lượng from the available 1 lượng in store_HT and creates another product_id for 1 lượng with 'sold' status to create a transaction order_3. Later on, the staff_admin creates another order_A2 to the manufacturer for the extra 1 lượng in order_3.

    - When admin need to check profit/loss, the app will calculate the money in (money from customers' order) - money out (money when raising manufacturer order and when buying back from the customers).

Backend best practices:
This is a tailored **FastAPI Code Guideline** designed to be used as a system prompt or a reference document for an AI coding agent. It ensures the AI generates consistent, professional-grade code that follows the patterns we discussed.

---

```markdown
# FastAPI Development Guidelines & Best Practices

## 1. Architectural Pattern: The 3-Tier Structure
All features must follow a strict separation of concerns. Do not mix database logic with route handling.



* **API Layer (`routers/`):** Request validation, calling services, and returning HTTP responses.
* **Service Layer (`services/`):** Business logic, complex calculations, and cross-module coordination.
* **Data Layer (`repositories/` or `crud/`):** Direct database interactions using SQLAlchemy/Tortoise.
* **Schemas (`schemas/`):** Pydantic models for data validation (In/Out).

---

## 2. Project Organization
Maintain a **Module-Based** directory structure to ensure scalability.

```text
app/
├── core/                # Config, security, global constants
├── db/                  # Session setup, base model
├── modules/             # Context-specific modules
│   └── [feature_name]/  # e.g., 'orders' or 'products'
│       ├── router.py
│       ├── service.py
│       ├── repository.py
│       ├── models.py    # Database models
│       └── schemas.py   # Pydantic models
└── main.py              # App initialization

```

---

## 3. Coding Standards

### **Asynchronous Programming**

* Use `async def` for I/O bound tasks using async libraries (e.g., `httpx`, `motor`, `sqlalchemy.ext.asyncio`).
* Use standard `def` for CPU-bound tasks or blocking libraries. FastAPI will handle these in a thread pool.
* **Never** use `time.sleep()` inside `async def`. Use `await asyncio.sleep()`.

### **Dependency Injection**

* Prefer FastAPI's `Depends` for database sessions, authentication, and service instantiation.
* Keep dependencies granular to allow for easy overriding during testing.

### **Pydantic Models**

* Always use `response_model` in decorators to filter output.
* Create specific schemas for different operations: `UserCreate`, `UserUpdate`, `UserRead`.
* Enable `from_attributes = True` (Pydantic v2) in `ConfigDict` for ORM compatibility.

---

## 4. Error Handling & Validation

* **Early Exit:** Raise `HTTPException` as soon as a validation or business rule fails.
* **Standardized Responses:** Use a global exception handler for custom internal errors to keep API responses consistent.
* **No Raw Dictionaries:** Always return Pydantic models or standard FastAPI responses.

---

## 5. Testing Requirements

* **Framework:** Use `pytest` with `httpx.AsyncClient`.
* **Isolation:** Always use `app.dependency_overrides` to swap production databases for a `sqlite+aiosqlite` in-memory database or a dedicated test container.
* **Fixtures:** Define shared fixtures in `conftest.py` for database setup/teardown and mock data injection.

---

## 6. Production Readiness

* **Environment:** Use `pydantic-settings` for `.env` management.
* **Security:** Always include `CORSMiddleware`. Disable Swagger UI in production via environment variables.
* **Logging:** Implement structured JSON logging for observability.

```

---

**Would you like me to generate a `conftest.py` file based on these guidelines to help the AI agent get started with testing?**

```

Test cases:

To test this business logic effectively, we need to focus on **state transitions** (of products) and **financial accuracy** (Profit/Loss). Using the FastAPI best practices we established, these tests would reside in your `tests/` directory and use a service-layer approach.

Here is the breakdown of test cases designed for an AI agent or a developer to implement.

---

### **Test Case 1: Initial Customer Order & Product Creation**

**Scenario:** Staff creates an order for items not currently in stock.

* **Action:** Call `create_order` with 3x1 lượng, 1x5 lượng, 1x1kg.
* **Expected Behavior:**
* System creates 5 new entries in the `products` table.
* All 5 products must have `status="sold"`.
* Order record is created linking these 5 product IDs.
* **Validation:** `assert len(db.products.filter(status="sold")) == 5`.



### **Test Case 2: Manufacturer Order (Replenishment & Buffer)**

**Scenario:** Admin orders the sold items plus one extra for stock.

* **Action:** Create `manufacturer_order` containing the 5 IDs from Test 1 + 1 new "5 lượng" item.
* **Expected Behavior:**
* The 5 original products remain `sold` (but now linked to a manufacturer PO).
* The 1 extra product is created with `status="available"` and assigned to the specified store.
* **Validation:** `assert product_extra.status == "available"`.



### **Test Case 3: Customer Buyback (Inventory Return)**

**Scenario:** Customer A sells their original 5 items back to the store.

* **Action:** Create a "Buyback" transaction linked to `order_1`.
* **Expected Behavior:**
* A new transaction record is created (Type: Buyback/Sold).
* The 5 product IDs previously marked `sold` must transition to `available`.
* **Validation:** `assert all(p.status == "available" for p in original_order_products)`.



### **Test Case 4: Selling from Existing "Available" Stock**

**Scenario:** Customer B buys the extra item created in Test 2.

* **Action:** Create `order_2` by selecting the specific `product_id` that is `available`.
* **Expected Behavior:**
* No new product record is created.
* The existing product status transitions from `available` to `sold`.
* **Validation:** `assert selected_product.status == "sold"`.



### **Test Case 5: Fulfillment Workflow**

**Scenario:** Physical delivery of the manufacturer's item to Customer B.

* **Action:** Staff selects `order_2` and marks as "Fulfilled".
* **Expected Behavior:**
* System creates a secondary transaction record with `price=0`.
* `linked_to_transaction` field must point to `order_2` ID.
* **Validation:** `assert fulfillment_trans.price == 0`.



### **Test Case 6: Hybrid Order (Stock + New Creation)**

**Scenario:** Customer B buys 2x1 lượng (1 exists in stock, 1 does not).

* **Action:** Create `order_3` selecting one `available` ID and triggering creation for the second.
* **Expected Behavior:**
* The existing ID changes to `sold`.
* A new ID is generated with status `sold`.
* **Validation:** `assert order_3.items_count == 2`.



### **Test Case 7: Profit & Loss (P&L) Calculation**

**Scenario:** Verify the financial formula is correct.

* **Logic:** 
* **Action:** Trigger `calculate_pl` for a specific period.
* **Expected Behavior:**
* Include: Money from Order 1, 2, and 3.
* Subtract: Cost of Order A1, A2, and the Buyback transaction from Test 3.
* **Validation:** Compare against a manual calculation of your example prices.



---

Here is the consolidated **SQLAlchemy** data model in a clean Markdown format. I have merged the duplicate `Store` definitions and organized the imports to follow standard Python PEP 8 practices.

```markdown
# Database Models: Silver Distribution System

This file contains the complete SQLAlchemy data models based on the business logic requirements for multi-store silver bullion tracking, staff transactions, and manufacturer ordering.

---

## 1. Imports and Configuration

```python
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

```

---

## 2. Enums (Standardized Types)

```python
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

```

---

## 3. Core Models

### **Store, Staff, and Customer (The Actors)**

```python
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

```

### **Product and Transactions (The Business Logic)**

```python
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

```

```