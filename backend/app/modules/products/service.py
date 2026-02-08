from typing import List, Optional
from .repository import ProductRepository
from . import schemas
from app.db.models import Product

class ProductService:
    def __init__(self, repository: ProductRepository):
        self.repository = repository

    async def get_product(self, product_id: int) -> Optional[Product]:
        return await self.repository.get(id=product_id)

    async def get_products(self, skip: int = 0, limit: int = 100) -> List[Product]:
        return await self.repository.get_multi(skip=skip, limit=limit)

    async def create_product(self, product_in: schemas.ProductCreate) -> Product:
        return await self.repository.create(obj_in=product_in)

    async def update_product(self, db_obj: Product, product_in: schemas.ProductUpdate) -> Product:
        return await self.repository.update(db_obj=db_obj, obj_in=product_in)

    async def delete_product(self, product_id: int):
        return await self.repository.remove(id=product_id)
