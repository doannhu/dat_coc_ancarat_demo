from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class StaffBase(BaseModel):
    staff_name: str
    username: str
    role: str

class StaffCreate(StaffBase):
    password: str

class StaffUpdate(BaseModel):
    staff_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

class StaffInDBBase(StaffBase):
    id: int
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

class Staff(StaffInDBBase):
    pass

class StaffList(BaseModel):
    staff: List[Staff]
