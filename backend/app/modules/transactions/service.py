from typing import List, Optional
from datetime import date, datetime, timezone
from app.db.models import Transaction, TransactionItem, TransactionType, ProductStatus, Product
from .repository import TransactionRepository
from app.modules.products.repository import ProductRepository
from app.modules.products import schemas as product_schemas
from . import schemas as transaction_schemas

class TransactionService:
    def __init__(self, repository: TransactionRepository, product_repository: ProductRepository):
        self.repository = repository
        self.product_repository = product_repository

    async def get_transactions(self, skip: int = 0, limit: int = 100, start_date: Optional[date] = None, end_date: Optional[date] = None, tx_type: Optional[str] = None) -> List[Transaction]:
        transactions = await self.repository.get_multi(skip=skip, limit=limit, start_date=start_date, end_date=end_date, tx_type=tx_type)
        
        # Get linked statuses for sale transactions
        sale_ids = [t.id for t in transactions if t.type == TransactionType.SALE]
        status_map = await self.repository.get_linked_statuses(sale_ids)
        
        # Populate order_status for each transaction
        for t in transactions:
            if t.id in status_map:
                t.order_status = status_map[t.id]
        
        return transactions

    async def get_stats(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> transaction_schemas.TransactionStats:
        return await self.repository.get_stats(start_date=start_date, end_date=end_date)

    async def get_transaction(self, transaction_id: int) -> Optional[Transaction]:
        return await self.repository.get(id=transaction_id)
      
    async def create_order(self, order_in: transaction_schemas.OrderCreate) -> Transaction:
        # Create Transaction logic is complex.
        # We need to manually construct the transaction object first
        
        # Handle timezone: Ensure created_at is naive UTC for DB compatibility
        tx_created = order_in.created_at or datetime.now(timezone.utc)
        if tx_created.tzinfo is not None:
             tx_created = tx_created.astimezone(timezone.utc).replace(tzinfo=None)

        transaction = Transaction(
            type=TransactionType.SALE,
            staff_id=order_in.staff_id,
            customer_id=order_in.customer_id,
            store_id=order_in.store_id,
            created_at=tx_created,
            payment_method=order_in.payment_method
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
                    # Create new product - from customer order, not yet ordered from manufacturer
                    prod_in = product_schemas.ProductCreate(
                        product_type=item.product_type,
                        status=ProductStatus.SOLD,
                        last_price=price,
                        store_id=order_in.store_id,
                        is_ordered=False  # Not ordered from manufacturer yet
                    )
                    product = await self.product_repository.create(prod_in)
                else:
                    # Use specific product_id if provided, otherwise find by type
                    if item.product_id:
                        product = await self.product_repository.get(id=item.product_id)
                        if not product:
                            raise ValueError(f"Product ID {item.product_id} not found")
                        if product.status != ProductStatus.AVAILABLE:
                            raise ValueError(f"Product ID {item.product_id} is not available")
                    else:
                        # Find available by type (legacy behavior)
                        product = await self.product_repository.find_available_by_type(
                            store_id=order_in.store_id, 
                            product_type=item.product_type
                        )
                        if not product:
                            raise ValueError(f"No available product {item.product_type} in store")
                    
                    # Update status to SOLD
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

    async def create_manufacturer_order(self, order_in: transaction_schemas.ManufacturerOrderCreate) -> Transaction:
        # Handle timezone
        tx_created = order_in.created_at or datetime.now(timezone.utc)
        if tx_created.tzinfo is not None:
             tx_created = tx_created.astimezone(timezone.utc).replace(tzinfo=None)

        transaction = Transaction(
            type=TransactionType.MANUFACTURER,
            staff_id=order_in.staff_id,
            store_id=order_in.store_id,
            created_at=tx_created,
            code=order_in.code,
            # No customer for manufacturer order
        )
        
        await self.repository.add_transaction(transaction)
        await self.repository.db.flush()

        for item in order_in.items:
            # Handle product_id (existing)
            if item.product_id:
                product = await self.product_repository.get(id=item.product_id)
                if not product:
                    raise ValueError(f"Product ID {item.product_id} not found")
                
                # Update is_ordered to True for existing product
                update_schema = product_schemas.ProductUpdate(is_ordered=True)
                await self.product_repository.update(db_obj=product, obj_in=update_schema)
                
                # Assume 1 existing product per item entry (quantity=1 for existing product)
                t_item = TransactionItem(
                    transaction_id=transaction.id, 
                    product_id=product.id, 
                    price_at_time=item.manufacturer_price
                )
                await self.repository.add_transaction_item(t_item)

            elif item.product_type:
                # Handle product_type (new products)
                qty = item.quantity
                for i in range(qty):
                    prod_in = product_schemas.ProductCreate(
                        product_type=item.product_type,
                        status=ProductStatus.AVAILABLE,  # Available since ordered from manufacturer
                        last_price=item.manufacturer_price,
                        store_id=order_in.store_id,
                        is_ordered=True  # Ordered from manufacturer
                    )
                    new_product = await self.product_repository.create(prod_in)

                    t_item = TransactionItem(
                        transaction_id=transaction.id, 
                        product_id=new_product.id, 
                        price_at_time=item.manufacturer_price
                    )
                    await self.repository.add_transaction_item(t_item)

        await self.repository.commit()
        await self.repository.refresh(transaction)
        return await self.repository.get(id=transaction.id)

    async def get_transactions_by_customer(self, customer_id: int, tx_type: str = None):
        """Get all transactions for a customer, optionally filtered by type"""
        return await self.repository.get_by_customer(customer_id=customer_id, tx_type=tx_type)

    async def create_buyback(self, buyback_in: transaction_schemas.BuybackCreate) -> Transaction:
        """Create a buyback transaction - products become available again"""
        # Handle timezone
        tx_created = buyback_in.created_at or datetime.now(timezone.utc)
        if tx_created.tzinfo is not None:
            tx_created = tx_created.astimezone(timezone.utc).replace(tzinfo=None)

        # Get original transaction to link and get customer
        original_tx = await self.repository.get(id=buyback_in.original_transaction_id)
        if not original_tx:
            raise ValueError(f"Original transaction {buyback_in.original_transaction_id} not found")

        transaction = Transaction(
            type=TransactionType.BUYBACK,
            staff_id=buyback_in.staff_id,
            store_id=buyback_in.store_id,
            customer_id=original_tx.customer_id,  # Same customer as original order
            created_at=tx_created,
            payment_method=buyback_in.payment_method,
            linked_transaction_id=buyback_in.original_transaction_id
        )
        
        await self.repository.add_transaction(transaction)
        await self.repository.db.flush()

        for item in buyback_in.items:
            product = await self.product_repository.get(id=item.product_id)
            if not product:
                raise ValueError(f"Product ID {item.product_id} not found")
            
            # Update product: status back to available, update price
            update_schema = product_schemas.ProductUpdate(
                status=ProductStatus.AVAILABLE,
                last_price=item.buyback_price
            )
            await self.product_repository.update(db_obj=product, obj_in=update_schema)

            # Create transaction item with buyback price
            t_item = TransactionItem(
                transaction_id=transaction.id,
                product_id=product.id,
                price_at_time=item.buyback_price
            )
            await self.repository.add_transaction_item(t_item)

        await self.repository.commit()
        await self.repository.refresh(transaction)
        return await self.repository.get(id=transaction.id)

    async def create_fulfillment(self, fulfillment_in: transaction_schemas.FulfillmentCreate):
        """Create a fulfillment transaction - delivering products to customer.
        
        This creates a fulfillment transaction linked to the original sale,
        and updates product status to DELIVERED.
        """
        from datetime import timezone
        
        tx_created = fulfillment_in.created_at or datetime.utcnow()
        if hasattr(tx_created, 'tzinfo') and tx_created.tzinfo is not None:
            tx_created = tx_created.astimezone(timezone.utc).replace(tzinfo=None)

        # Get original transaction to link and get customer
        original_tx = await self.repository.get(id=fulfillment_in.original_transaction_id)
        if not original_tx:
            raise ValueError(f"Original transaction {fulfillment_in.original_transaction_id} not found")

        transaction = Transaction(
            type=TransactionType.FULFILLMENT,
            staff_id=fulfillment_in.staff_id,
            store_id=fulfillment_in.store_id,
            customer_id=original_tx.customer_id,  # Same customer as original order
            created_at=tx_created,
            linked_transaction_id=fulfillment_in.original_transaction_id
        )
        
        await self.repository.add_transaction(transaction)
        await self.repository.db.flush()

        for item in fulfillment_in.items:
            product = await self.product_repository.get(id=item.product_id)
            if not product:
                raise ValueError(f"Product ID {item.product_id} not found")
            
            # Update product status to FULFILLED
            update_schema = product_schemas.ProductUpdate(
                status=ProductStatus.FULFILLED
            )
            await self.product_repository.update(db_obj=product, obj_in=update_schema)

            # Create transaction item with the product's last price
            t_item = TransactionItem(
                transaction_id=transaction.id,
                product_id=product.id,
                price_at_time=product.last_price or 0
            )
            await self.repository.add_transaction_item(t_item)

        await self.repository.commit()
        await self.repository.refresh(transaction)
        return await self.repository.get(id=transaction.id)
