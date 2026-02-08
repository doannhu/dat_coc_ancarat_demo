from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from . import schemas as customer_schema
from .service import CustomerService
from .repository import CustomerRepository

router = APIRouter()

# Dependency Injection
def get_service(db: AsyncSession = Depends(get_db)) -> CustomerService:
    repository = CustomerRepository(db)
    return CustomerService(repository)

@router.get("/", response_model=List[customer_schema.CustomerInDBBase])
async def read_customers(
    skip: int = 0, 
    limit: int = 100, 
    service: CustomerService = Depends(get_service)
):
    return await service.get_customers(skip=skip, limit=limit)

@router.post("/", response_model=customer_schema.CustomerInDBBase)
async def create_customer(
    customer: customer_schema.CustomerCreate, 
    service: CustomerService = Depends(get_service)
):
    return await service.create_customer(customer_in=customer)

@router.get("/{id}", response_model=customer_schema.CustomerInDBBase)
async def read_customer(
    id: int, 
    service: CustomerService = Depends(get_service)
):
    customer = await service.get_customer(customer_id=id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{id}", response_model=customer_schema.CustomerInDBBase)
async def update_customer(
    id: int, 
    customer_in: customer_schema.CustomerUpdate, 
    service: CustomerService = Depends(get_service)
):
    customer = await service.get_customer(customer_id=id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return await service.update_customer(db_obj=customer, customer_in=customer_in)

@router.delete("/{id}")
async def delete_customer(
    id: int, 
    service: CustomerService = Depends(get_service)
):
    customer = await service.get_customer(customer_id=id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    await service.delete_customer(customer_id=id)
    return {"ok": True}
