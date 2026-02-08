from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Store
from . import schemas as store_schema

class StoreRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: int):
        return await self.db.get(Store, id)

    async def get_multi(self, skip: int = 0, limit: int = 100):
        result = await self.db.execute(select(Store).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, obj_in: store_schema.StoreCreate):
        db_obj = Store(
            name=obj_in.name,
            location=obj_in.location,
            phone_number=obj_in.phone_number,
            is_active=obj_in.is_active
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(self, *, db_obj: Store, obj_in: store_schema.StoreUpdate):
        for field, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, field, value)
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def remove(self, *, id: int):
        obj = await self.db.get(Store, id)
        await self.db.delete(obj)
        await self.db.commit()
        return obj
