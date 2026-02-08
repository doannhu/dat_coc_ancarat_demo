from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Staff
from . import schemas as staff_schema

class StaffRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: int):
        return await self.db.get(Staff, id)

    async def get_multi(self, skip: int = 0, limit: int = 100):
        result = await self.db.execute(select(Staff).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, obj_in: staff_schema.StaffCreate):
        # TODO: Add password hashing
        fake_hashed_password = obj_in.password + "notreallyhashed" 
        
        db_obj = Staff(
            staff_name=obj_in.staff_name,
            username=obj_in.username,
            role=obj_in.role,
            hashed_password=fake_hashed_password 
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(self, *, db_obj: Staff, obj_in: staff_schema.StaffUpdate):
        for field, value in obj_in.model_dump(exclude_unset=True).items():
            if field == "password" and value:
                 setattr(db_obj, "hashed_password", value + "notreallyhashed")
            else:
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def remove(self, *, id: int):
        obj = await self.db.get(Staff, id)
        await self.db.delete(obj)
        await self.db.commit()
        return obj
