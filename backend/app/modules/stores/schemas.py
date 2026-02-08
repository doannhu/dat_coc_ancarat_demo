from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class StoreBase(BaseModel):
    name: str
    location: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool = True

class StoreCreate(StoreBase):
    pass

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None

class StoreInDBBase(StoreBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class Store(StoreInDBBase):
    pass

class StoreList(BaseModel):
    stores: List[Store]
