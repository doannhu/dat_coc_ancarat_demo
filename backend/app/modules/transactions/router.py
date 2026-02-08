from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.products.repository import ProductRepository
from . import schemas as transaction_schema
from .service import TransactionService
from .repository import TransactionRepository

router = APIRouter()

# Dependency Injection
def get_service(db: AsyncSession = Depends(get_db)) -> TransactionService:
    repository = TransactionRepository(db)
    product_repository = ProductRepository(db)
    return TransactionService(repository, product_repository)

@router.get("/", response_model=List[transaction_schema.Transaction])
async def read_transactions(
    skip: int = 0, 
    limit: int = 100, 
    service: TransactionService = Depends(get_service)
):
    return await service.get_transactions(skip=skip, limit=limit)

@router.get("/{id}", response_model=transaction_schema.Transaction)
async def read_transaction(
    id: int, 
    service: TransactionService = Depends(get_service)
):
    transaction = await service.get_transaction(transaction_id=id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@router.post("/order", response_model=transaction_schema.Transaction)
async def create_order(
    order: transaction_schema.OrderCreate, 
    service: TransactionService = Depends(get_service)
):
    try:
        return await service.create_order(order_in=order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
