from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.db.models import ProductType, ProductStatus

class ProductBase(BaseModel):
    product_type: str
    status: ProductStatus = ProductStatus.AVAILABLE
    last_price: Optional[float] = None
    store_id: int

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    product_type: Optional[str] = None
    status: Optional[ProductStatus] = None
    last_price: Optional[float] = None
    store_id: Optional[int] = None

class ProductInDBBase(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Product(ProductInDBBase):
    pass

class ProductList(BaseModel):
    products: List[Product]
