from typing import List, Optional
from .repository import StaffRepository
from . import schemas
from app.db.models import Staff

class StaffService:
    def __init__(self, repository: StaffRepository):
        self.repository = repository

    async def get_staff(self, staff_id: int) -> Optional[Staff]:
        return await self.repository.get(id=staff_id)

    async def get_staffs(self, skip: int = 0, limit: int = 100) -> List[Staff]:
        return await self.repository.get_multi(skip=skip, limit=limit)

    async def create_staff(self, staff_in: schemas.StaffCreate) -> Staff:
        # Business logic for password complexity or duplicate username check could go here
        return await self.repository.create(obj_in=staff_in)

    async def update_staff(self, db_obj: Staff, staff_in: schemas.StaffUpdate) -> Staff:
        return await self.repository.update(db_obj=db_obj, obj_in=staff_in)

    async def delete_staff(self, staff_id: int):
        return await self.repository.remove(id=staff_id)
