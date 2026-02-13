from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from . import schemas as product_schema
from .service import ProductService
from .repository import ProductRepository

router = APIRouter()

# Dependency Injection
def get_service(db: AsyncSession = Depends(get_db)) -> ProductService:
    repository = ProductRepository(db)
    return ProductService(repository)

@router.get("/", response_model=List[product_schema.ProductInDBBase])
async def read_products(
    skip: int = 0, 
    limit: int = 100, 
    service: ProductService = Depends(get_service)
):
    return await service.get_products(skip=skip, limit=limit)

@router.get("/available", response_model=List[product_schema.Product])
async def read_available_products(
    skip: int = 0, 
    limit: int = 100, 
    service: ProductService = Depends(get_service)
):
    """Get available products with store name and last price"""
    return await service.get_available_products(skip=skip, limit=limit)

@router.get("/pending-manufacturer", response_model=List[product_schema.Product])
async def read_pending_manufacturer_products(
    service: ProductService = Depends(get_service)
):
    """Get products from customer orders not yet ordered from manufacturer"""
    return await service.get_pending_manufacturer_order()

from pydantic import BaseModel

class ProductIdsRequest(BaseModel):
    product_ids: List[int]

@router.post("/status-info", response_model=List[product_schema.ProductStatusInfo])
async def get_products_status_info(
    payload: ProductIdsRequest, 
    service: ProductService = Depends(get_service)
):
    """Get detailed status info (Sale/Buyback history) for products"""
    return await service.get_status_info(payload.product_ids)

@router.get("/store/{store_id}", response_model=List[product_schema.Product])
async def read_products_by_store(
    store_id: int,
    service: ProductService = Depends(get_service)
):
    """Get available products for a specific store"""
    return await service.get_available_by_store(store_id=store_id)

@router.post("/{product_id}/move")
async def move_product(
    product_id: int,
    new_store_id: int,
    service: ProductService = Depends(get_service)
):
    """Move an available product to a different store"""
    try:
        product = await service.move_product(product_id=product_id, new_store_id=new_store_id)
        return {"ok": True, "product_id": product.id, "new_store_id": product.store_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


from pydantic import BaseModel
from typing import List

class DeliveryStatusUpdate(BaseModel):
    product_id: int
    is_delivered: bool

class BatchDeliveryStatusUpdate(BaseModel):
    updates: List[DeliveryStatusUpdate]

@router.post("/delivery-status/batch")
async def update_delivery_status_batch(
    payload: BatchDeliveryStatusUpdate,
    service: ProductService = Depends(get_service)
):
    """Batch update delivery status for multiple products (from manufacturer)"""
    try:
        updates = [{"product_id": u.product_id, "is_delivered": u.is_delivered} for u in payload.updates]
        await service.update_delivery_status_batch(updates)
        return {"ok": True, "updated_count": len(updates)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/", response_model=product_schema.ProductInDBBase)
async def create_product(
    product: product_schema.ProductCreate, 
    service: ProductService = Depends(get_service)
):
    return await service.create_product(product_in=product)

@router.get("/{id}", response_model=product_schema.Product)
async def read_product(
    id: int, 
    service: ProductService = Depends(get_service)
):
    product = await service.get_product(product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/{id}", response_model=product_schema.ProductInDBBase)
async def update_product(
    id: int, 
    product_in: product_schema.ProductUpdate, 
    service: ProductService = Depends(get_service)
):
    product = await service.get_product(product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return await service.update_product(db_obj=product, product_in=product_in)

@router.delete("/{id}")
async def delete_product(
    id: int, 
    service: ProductService = Depends(get_service)
):
    product = await service.get_product(product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await service.delete_product(product_id=id)
    return {"ok": True}

## NOTE: Swap endpoint moved to /api/v1/transactions/swap for proper audit tracking
