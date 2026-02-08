from typing import List, Optional
from datetime import datetime
from app.db.models import Transaction, TransactionItem, TransactionType, ProductStatus, Product
from .repository import TransactionRepository
from app.modules.products.repository import ProductRepository
from app.modules.products import schemas as product_schemas
from . import schemas as transaction_schemas

class TransactionService:
    def __init__(self, repository: TransactionRepository, product_repository: ProductRepository):
        self.repository = repository
        self.product_repository = product_repository

    async def get_transactions(self, skip: int = 0, limit: int = 100) -> List[Transaction]:
        return await self.repository.get_multi(skip=skip, limit=limit)

    async def get_transaction(self, transaction_id: int) -> Optional[Transaction]:
        return await self.repository.get(id=transaction_id)
      
    async def create_order(self, order_in: transaction_schemas.OrderCreate) -> Transaction:
        # Create Transaction logic is complex.
        # We need to manually construct the transaction object first
        transaction = Transaction(
            type=TransactionType.SALE,
            staff_id=order_in.staff_id,
            customer_id=order_in.customer_id,
            store_id=order_in.store_id,
            created_at=datetime.utcnow()
        )
        
        await self.repository.add_transaction(transaction)
        # We need the ID, so we flush
        await self.repository.db.flush() 

        for item in order_in.items:
            qty = item.quantity
            price = item.price
            
            for _ in range(qty):
                product = None
                if item.is_new:
                    # Create new product
                    prod_in = product_schemas.ProductCreate(
                        product_type=item.product_type,
                        status=ProductStatus.SOLD,
                        last_price=price,
                        store_id=order_in.store_id
                    )
                    product = await self.product_repository.create(prod_in)
                else:
                    # Find available
                    product = await self.product_repository.find_available_by_type(
                        store_id=order_in.store_id, 
                        product_type=item.product_type
                    )

                    if not product:
                         # Decide policy: Raise error or create new? 
                         # Requirement usually implies check availability first.
                         # If checking available fails, we might create new if allowed?
                         # For now, raise Error to match original logic
                         raise ValueError(f"No available product {item.product_type} in store")
                    
                    # Update status
                    update_schema = product_schemas.ProductUpdate(
                        status=ProductStatus.SOLD,
                        last_price=price
                    )
                    product = await self.product_repository.update(db_obj=product, obj_in=update_schema)

                # Link Item
                t_item = TransactionItem(
                    transaction_id=transaction.id, 
                    product_id=product.id, 
                    price_at_time=price
                )
                await self.repository.add_transaction_item(t_item)
        
        await self.repository.commit()
        await self.repository.refresh(transaction)
        
        # Re-fetch to ensure all items are loaded
        return await self.repository.get(id=transaction.id)

