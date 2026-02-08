from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Product, ProductStatus
from . import schemas as product_schema

class ProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: int):
        return await self.db.get(Product, id)

    async def get_multi(self, skip: int = 0, limit: int = 100):
        result = await self.db.execute(select(Product).offset(skip).limit(limit))
        return result.scalars().all()

    async def find_available_by_type(self, store_id: int, product_type: str):
        result = await self.db.execute(
            select(Product).where(
                Product.store_id == store_id,
                Product.product_type == product_type,
                Product.status == ProductStatus.AVAILABLE
            ).limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, obj_in: product_schema.ProductCreate):
        db_obj = Product(
            product_type=obj_in.product_type,
            status=obj_in.status,
            last_price=obj_in.last_price,
            store_id=obj_in.store_id
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(self, *, db_obj: Product, obj_in: product_schema.ProductUpdate):
        for field, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, field, value)
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def remove(self, *, id: int):
        obj = await self.db.get(Product, id)
        await self.db.delete(obj)
        await self.db.commit()
        return obj
