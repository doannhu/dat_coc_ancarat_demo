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
            selectinload(Product.store),
            selectinload(Product.transactions)
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
            product_code=obj_in.product_code,
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

    async def get_received_unassigned(self):
        """Get products with status RECEIVED_FROM_MFR that are not assigned to any customer.
        A product is 'assigned' if it appears in a SALE transaction that has NOT been bought back.
        """
        from app.db.models import TransactionItem, TransactionType

        # Sale transaction IDs that were bought back
        bought_back_ids = select(Transaction.linked_transaction_id).where(
            Transaction.type == TransactionType.BUYBACK,
            Transaction.linked_transaction_id.isnot(None)
        )

        # Product IDs in active (not bought back) sale transactions
        sold_product_ids = select(TransactionItem.product_id).join(
            Transaction, TransactionItem.transaction_id == Transaction.id
        ).where(
            Transaction.type == TransactionType.SALE,
            Transaction.id.notin_(bought_back_ids)
        )

        query = select(Product).options(
            selectinload(Product.store),
            selectinload(Product.transactions)
        ).where(
            Product.status == ProductStatus.RECEIVED_FROM_MFR,
            Product.id.notin_(sold_product_ids)
        ).order_by(Product.store_id, Product.product_type, Product.id)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_manufacturer_codes_for_products(self, product_ids: list) -> dict:
        """Returns {product_id: manufacturer_code} by traversing:
        product -> Nhận hàng NSX tx -> linked Đặt hàng NSX tx -> code
        """
        from app.db.models import TransactionItem, TransactionType

        received_subq = (
            select(
                TransactionItem.product_id,
                Transaction.linked_transaction_id
            )
            .join(Transaction, TransactionItem.transaction_id == Transaction.id)
            .where(
                TransactionItem.product_id.in_(product_ids),
                Transaction.type == TransactionType.MANUFACTURER_RECEIVED
            )
            .subquery()
        )

        mfr_tx = Transaction.__table__.alias('mfr_tx')
        query = (
            select(received_subq.c.product_id, mfr_tx.c.code)
            .join(mfr_tx, mfr_tx.c.id == received_subq.c.linked_transaction_id)
        )

        result = await self.db.execute(query)
        return {row.product_id: row.code for row in result.all() if row.code}

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
