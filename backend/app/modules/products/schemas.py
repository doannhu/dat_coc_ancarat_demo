from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.db.models import ProductType, ProductStatus

from datetime import datetime

class ProductBase(BaseModel):
    product_type: str
    product_code: Optional[str] = None
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

class ProductSwap(BaseModel):
    product_id_1: int
    product_id_2: int
    note: Optional[str] = None

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
    store: Optional[Store] = None


class ProductWithTransactions(ProductInDBBase):
    pass
    # Implementation deferred until we load relationships correctly

class ProductList(BaseModel):
    products: List[Product]

class BuybackInfo(BaseModel):
    transaction_code: Optional[str] = None
    created_at: datetime
    customer_name: Optional[str] = None

class ProductStatusInfo(BaseModel):
    id: int
    status: ProductStatus
    buyback_info: Optional[BuybackInfo] = None
    sale_info: Optional[BuybackInfo] = None
    swap_info: Optional[BuybackInfo] = None  # Returned to inventory via swap (Hoán đổi)
