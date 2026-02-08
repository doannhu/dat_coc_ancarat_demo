from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from . import schemas as staff_schema
from .service import StaffService
from .repository import StaffRepository

router = APIRouter()

# Dependency Injection
def get_service(db: AsyncSession = Depends(get_db)) -> StaffService:
    repository = StaffRepository(db)
    return StaffService(repository)

@router.get("/", response_model=List[staff_schema.StaffInDBBase])
async def read_staffs(
    skip: int = 0, 
    limit: int = 100, 
    service: StaffService = Depends(get_service)
):
    return await service.get_staffs(skip=skip, limit=limit)

@router.post("/", response_model=staff_schema.StaffInDBBase)
async def create_staff(
    staff: staff_schema.StaffCreate, 
    service: StaffService = Depends(get_service)
):
    return await service.create_staff(staff_in=staff)

@router.get("/{id}", response_model=staff_schema.StaffInDBBase)
async def read_staff(
    id: int, 
    service: StaffService = Depends(get_service)
):
    staff = await service.get_staff(staff_id=id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff

@router.put("/{id}", response_model=staff_schema.StaffInDBBase)
async def update_staff(
    id: int, 
    staff_in: staff_schema.StaffUpdate, 
    service: StaffService = Depends(get_service)
):
    staff = await service.get_staff(staff_id=id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return await service.update_staff(db_obj=staff, staff_in=staff_in)

@router.delete("/{id}")
async def delete_staff(
    id: int, 
    service: StaffService = Depends(get_service)
):
    staff = await service.get_staff(staff_id=id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    await service.delete_staff(staff_id=id)
    return {"ok": True}
