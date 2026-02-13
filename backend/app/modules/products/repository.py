from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.models import Product, ProductStatus, Transaction
from . import schemas as product_schema

class ProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: int):
        # Eager load transactions -> customer/store for details, and Product.store
        query = select(Product).options(
            selectinload(Product.transactions).selectinload(Transaction.customer),
            selectinload(Product.transactions).selectinload(Transaction.store),
            selectinload(Product.store)
        ).where(Product.id == id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi(self, skip: int = 0, limit: int = 100):
        # Also eager load here if we want to show it in list
        query = select(Product).options(
            selectinload(Product.transactions).selectinload(Transaction.customer),
            selectinload(Product.transactions).selectinload(Transaction.store)
        ).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_available(self, skip: int = 0, limit: int = 100):
        """Get available products with store info"""
        query = select(Product).options(
            selectinload(Product.store)
        ).where(Product.status == ProductStatus.AVAILABLE).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_available_by_store(self, store_id: int):
        """Get available products for a specific store"""
        query = select(Product).options(
            selectinload(Product.store)
        ).where(
            Product.status == ProductStatus.AVAILABLE,
            Product.store_id == store_id
        ).order_by(Product.id)
        result = await self.db.execute(query)
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
            store_id=obj_in.store_id,
            is_ordered=obj_in.is_ordered
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

    async def get_pending_manufacturer_order(self):
        """Get products from customer orders that are not yet ordered from manufacturer.
        These are products with is_ordered=False and status=SOLD (from customer sales).
        """
        from app.db.models import TransactionItem, TransactionType
        
        # Get products that:
        # 1. Have is_ordered = False (not ordered from manufacturer yet)
        # 2. Are linked to a sale transaction (customer order)
        query = select(Product).options(
            selectinload(Product.store),
            selectinload(Product.transactions).selectinload(Transaction.customer)
        ).where(
            Product.is_ordered == False,
            Product.status == ProductStatus.SOLD  # From customer sales
        ).order_by(Product.id.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()
