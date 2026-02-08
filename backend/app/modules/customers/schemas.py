from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    cccd: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    name: Optional[str] = None

class CustomerInDBBase(CustomerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class Customer(CustomerInDBBase):
    pass

class CustomerList(BaseModel):
    customers: List[Customer]
