from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Customer
from . import schemas as customer_schema

class CustomerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: int):
        return await self.db.get(Customer, id)

    async def get_multi(self, skip: int = 0, limit: int = 100):
        result = await self.db.execute(select(Customer).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, obj_in: customer_schema.CustomerCreate):
        db_obj = Customer(
            name=obj_in.name,
            cccd=obj_in.cccd,
            phone_number=obj_in.phone_number,
            address=obj_in.address
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(self, *, db_obj: Customer, obj_in: customer_schema.CustomerUpdate):
        for field, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, field, value)
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def remove(self, *, id: int):
        obj = await self.db.get(Customer, id)
        await self.db.delete(obj)
        await self.db.commit()
        return obj
