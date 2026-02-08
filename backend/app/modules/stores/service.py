from typing import List, Optional
from .repository import StoreRepository
from . import schemas
from app.db.models import Store

class StoreService:
    def __init__(self, repository: StoreRepository):
        self.repository = repository

    async def get_store(self, store_id: int) -> Optional[Store]:
        return await self.repository.get(id=store_id)

    async def get_stores(self, skip: int = 0, limit: int = 100) -> List[Store]:
        return await self.repository.get_multi(skip=skip, limit=limit)

    async def create_store(self, store_in: schemas.StoreCreate) -> Store:
        return await self.repository.create(obj_in=store_in)

    async def update_store(self, db_obj: Store, store_in: schemas.StoreUpdate) -> Store:
        return await self.repository.update(db_obj=db_obj, obj_in=store_in)

    async def delete_store(self, store_id: int):
        return await self.repository.remove(id=store_id)
