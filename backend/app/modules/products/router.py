from typing import List
from fastapi import APIRouter, Depends, HTTPException
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

@router.post("/", response_model=product_schema.ProductInDBBase)
async def create_product(
    product: product_schema.ProductCreate, 
    service: ProductService = Depends(get_service)
):
    return await service.create_product(product_in=product)

@router.get("/{id}", response_model=product_schema.ProductInDBBase)
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
