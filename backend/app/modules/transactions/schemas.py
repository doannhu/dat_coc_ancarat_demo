from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.db.models import TransactionType

class TransactionItemBase(BaseModel):
    product_id: int
    price_at_time: float

class TransactionItemCreate(TransactionItemBase):
    pass

class TransactionItem(TransactionItemBase):
    id: int
    transaction_id: int
    model_config = ConfigDict(from_attributes=True)

class TransactionBase(BaseModel):
    type: str
    customer_id: Optional[int] = None
    staff_id: int
    store_id: int
    linked_transaction_id: Optional[int] = None

class TransactionCreate(TransactionBase):
    # This is slightly simplified. For complex operations like 'create_order', 
    # the input might need to be richer (e.g. list of product types and quantities, not just IDs).
    # We might need specific schemas for specific operations (e.g. OrderCreate, BuybackCreate)
    # But for raw CRUD, this is fine.
    pass

class OrderCreateItem(BaseModel):
    product_type: str
    quantity: int
    price: float
    is_new: bool = True

class OrderCreate(BaseModel):
    staff_id: int
    customer_id: int
    store_id: int
    items: List[OrderCreateItem]

class TransactionInDBBase(TransactionBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Transaction(TransactionInDBBase):
    items: List[TransactionItem] = []

class TransactionList(BaseModel):
    transactions: List[Transaction]
