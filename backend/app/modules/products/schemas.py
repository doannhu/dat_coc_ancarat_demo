from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.db.models import ProductType, ProductStatus

from datetime import datetime

class ProductBase(BaseModel):
    product_type: str
    status: ProductStatus = ProductStatus.AVAILABLE
    last_price: Optional[float] = None
    store_id: int
    is_ordered: bool = False
    is_delivered: bool = False

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    product_type: Optional[str] = None
    status: Optional[ProductStatus] = None
    last_price: Optional[float] = None
    store_id: Optional[int] = None
    is_ordered: Optional[bool] = None
    is_delivered: Optional[bool] = None

from app.modules.customers.schemas import Customer
from app.modules.stores.schemas import Store

class TransactionInfo(BaseModel):
    id: int
    created_at: datetime
    customer: Optional[Customer] = None
    store: Optional[Store] = None
    model_config = ConfigDict(from_attributes=True)



class ProductInDBBase(ProductBase):
    id: int
    is_ordered: bool = False
    is_delivered: bool = False
    model_config = ConfigDict(from_attributes=True)

class Product(ProductInDBBase):
    # Optional fields for UI convenience
    customer_name: Optional[str] = None
    order_date: Optional[datetime] = None
    store_name: Optional[str] = None


class ProductWithTransactions(ProductInDBBase):
    pass
    # Implementation deferred until we load relationships correctly

class ProductList(BaseModel):
    products: List[Product]
