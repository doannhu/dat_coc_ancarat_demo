from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.products.repository import ProductRepository
from app.modules.products.service import ProductService
from . import schemas as transaction_schema
from .service import TransactionService
from .repository import TransactionRepository

router = APIRouter()

# Dependency Injection
def get_service(db: AsyncSession = Depends(get_db)) -> TransactionService:
    repository = TransactionRepository(db)
    product_repository = ProductRepository(db)
    product_service = ProductService(product_repository)
    return TransactionService(repository, product_service)

@router.get("/stats", response_model=transaction_schema.TransactionStats)
async def get_transaction_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    service: TransactionService = Depends(get_service)
):
    return await service.get_stats(start_date=start_date, end_date=end_date)
@router.get("/", response_model=List[transaction_schema.Transaction])
async def read_transactions(
    skip: int = 0, 
    limit: int = 100, 
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    tx_type: Optional[str] = None,
    service: TransactionService = Depends(get_service)
):
    return await service.get_transactions(skip=skip, limit=limit, start_date=start_date, end_date=end_date, tx_type=tx_type)

@router.get("/customer/{customer_id}", response_model=List[transaction_schema.Transaction])
async def get_customer_transactions(
    customer_id: int,
    tx_type: Optional[str] = None,
    service: TransactionService = Depends(get_service)
):
    """Get all transactions for a specific customer"""
    return await service.get_transactions_by_customer(customer_id=customer_id, tx_type=tx_type)

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
@router.post("/manufacturer-order", response_model=transaction_schema.Transaction)
async def create_manufacturer_order(
    order: transaction_schema.ManufacturerOrderCreate, 
    service: TransactionService = Depends(get_service)
):
    try:
        return await service.create_manufacturer_order(order_in=order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/buyback", response_model=transaction_schema.Transaction)
async def create_buyback(
    buyback: transaction_schema.BuybackCreate,
    service: TransactionService = Depends(get_service)
):
    """Create a buyback transaction - products become available again"""
    try:
        return await service.create_buyback(buyback_in=buyback)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/fulfillment", response_model=transaction_schema.Transaction)
async def create_fulfillment(
    fulfillment: transaction_schema.FulfillmentCreate,
    service: TransactionService = Depends(get_service)
):
    """Create a fulfillment transaction - products delivered to customer"""
    try:
        return await service.create_fulfillment(fulfillment_in=fulfillment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sell-back", response_model=transaction_schema.Transaction)
async def create_sell_back(
    sell_back: transaction_schema.SellBackCreate,
    service: TransactionService = Depends(get_service)
):
    """Create a sell-back transaction - products sold back to manufacturer"""
    try:
        return await service.create_sell_back(sell_back_in=sell_back)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/manufacturer-receive", response_model=transaction_schema.Transaction)
async def create_manufacturer_receive(
    receive: transaction_schema.ManufacturerReceiveCreate,
    service: TransactionService = Depends(get_service)
):
    """Create a manufacturer receive transaction - products received from manufacturer"""
    try:
        return await service.create_manufacturer_receive(receive_in=receive)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/swap", response_model=transaction_schema.Transaction)
async def create_swap(
    swap: transaction_schema.SwapCreate,
    service: TransactionService = Depends(get_service)
):
    """Swap two products between customers/inventory with audit trail"""
    try:
        return await service.create_swap(swap_in=swap)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
