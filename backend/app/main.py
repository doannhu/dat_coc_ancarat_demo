from fastapi import FastAPI
from app.core import config
from app.db import session, models
from app.db.base import Base
from app.modules.customers import router as customers
from app.modules.stores import router as stores
from app.modules.staff import router as staff
from app.modules.products import router as products
from app.modules.transactions import router as transactions

app = FastAPI(title="Silver Distribution System", version="1.0.0")

app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(stores.router, prefix="/api/v1/stores", tags=["stores"])
app.include_router(staff.router, prefix="/api/v1/staff", tags=["staff"])
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])

@app.on_event("startup")
async def startup_event():
    async with session.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"message": "Welcome to Silver Distribution System API"}
