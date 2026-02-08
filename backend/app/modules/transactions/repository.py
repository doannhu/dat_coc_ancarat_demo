from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.models import Transaction, TransactionItem
from . import schemas as transaction_schema

class TransactionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: int):
        # Eager load items
        result = await self.db.execute(select(Transaction).options(selectinload(Transaction.items)).where(Transaction.id == id))
        return result.scalar_one_or_none()

    async def get_multi(self, skip: int = 0, limit: int = 100):
        # Eager load items
        result = await self.db.execute(select(Transaction).options(selectinload(Transaction.items)).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, obj_in: transaction_schema.TransactionCreate):
        # This is basic create. Complex logic is in Service.
        pass

    async def add_transaction(self, transaction: Transaction):
        self.db.add(transaction)
        await self.db.flush() # Populate ID but don't commit yet

    async def add_transaction_item(self, item: TransactionItem):
        self.db.add(item)
        
    async def commit(self):
        await self.db.commit()

    async def refresh(self, obj):
        await self.db.refresh(obj)
