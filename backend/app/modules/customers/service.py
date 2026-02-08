from typing import List, Optional
from .repository import CustomerRepository
from . import schemas
from app.db.models import Customer

class CustomerService:
    def __init__(self, repository: CustomerRepository):
        self.repository = repository

    async def get_customer(self, customer_id: int) -> Optional[Customer]:
        return await self.repository.get(id=customer_id)

    async def get_customers(self, skip: int = 0, limit: int = 100) -> List[Customer]:
        return await self.repository.get_multi(skip=skip, limit=limit)

    async def create_customer(self, customer_in: schemas.CustomerCreate) -> Customer:
        # Business logic can be added here (e.g. check duplicate CCCD)
        return await self.repository.create(obj_in=customer_in)

    async def update_customer(self, db_obj: Customer, customer_in: schemas.CustomerUpdate) -> Customer:
        return await self.repository.update(db_obj=db_obj, obj_in=customer_in)

    async def delete_customer(self, customer_id: int):
        return await self.repository.remove(id=customer_id)
