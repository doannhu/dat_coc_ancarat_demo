from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from . import schemas as store_schema
from .service import StoreService
from .repository import StoreRepository

router = APIRouter()

# Dependency Injection
def get_service(db: AsyncSession = Depends(get_db)) -> StoreService:
    repository = StoreRepository(db)
    return StoreService(repository)

@router.get("/", response_model=List[store_schema.StoreInDBBase])
async def read_stores(
    skip: int = 0, 
    limit: int = 100, 
    service: StoreService = Depends(get_service)
):
    return await service.get_stores(skip=skip, limit=limit)

@router.post("/", response_model=store_schema.StoreInDBBase)
async def create_store(
    store: store_schema.StoreCreate, 
    service: StoreService = Depends(get_service)
):
    return await service.create_store(store_in=store)

@router.get("/{id}", response_model=store_schema.StoreInDBBase)
async def read_store(
    id: int, 
    service: StoreService = Depends(get_service)
):
    store = await service.get_store(store_id=id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@router.put("/{id}", response_model=store_schema.StoreInDBBase)
async def update_store(
    id: int, 
    store_in: store_schema.StoreUpdate, 
    service: StoreService = Depends(get_service)
):
    store = await service.get_store(store_id=id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return await service.update_store(db_obj=store, store_in=store_in)

@router.delete("/{id}")
async def delete_store(
    id: int, 
    service: StoreService = Depends(get_service)
):
    store = await service.get_store(store_id=id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    await service.delete_store(store_id=id)
    return {"ok": True}
