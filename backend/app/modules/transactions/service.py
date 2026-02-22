from typing import List, Optional
from sqlalchemy import select
from datetime import date, datetime, timezone
from app.db.models import Transaction, TransactionItem, TransactionType, ProductStatus, Product
from .repository import TransactionRepository
from app.modules.products.service import ProductService
from app.modules.products import schemas as product_schemas
from . import schemas as transaction_schemas

class TransactionService:
    def __init__(self, repository: TransactionRepository, product_service: ProductService):
        self.repository = repository
        self.product_service = product_service
        self.product_repository = product_service.repository

    async def get_transactions(self, skip: int = 0, limit: int = 100, start_date: Optional[date] = None, end_date: Optional[date] = None, tx_type: Optional[str] = None) -> List[Transaction]:
        if tx_type:
            normalized = tx_type.replace("+", " ").strip()
            if normalized in (TransactionType.SALE.value, "sale", "SALE"):
                tx_type = TransactionType.SALE.value
            elif normalized in (t.value for t in TransactionType):
                tx_type = normalized
            else:
                tx_type = normalized
        transactions = await self.repository.get_multi(skip=skip, limit=limit, start_date=start_date, end_date=end_date, tx_type=tx_type)
        
        # Get linked statuses for sale transactions
        sale_ids = [t.id for t in transactions if t.type == TransactionType.SALE]
        status_map = await self.repository.get_linked_statuses(sale_ids)
        
        # Populate order_status for each transaction
        for t in transactions:
            if t.id in status_map:
                t.order_status = status_map[t.id]

        # Populate product.customer_name for all items (who will receive this product)
        product_ids = []
        for t in transactions:
            for item in t.items:
                if item.product_id:
                    product_ids.append(item.product_id)
        if product_ids:
            customer_names = await self.repository.get_product_customer_names(product_ids)
            received_dates = await self.repository.get_product_received_dates(product_ids)
            for t in transactions:
                for item in t.items:
                    if item.product and item.product_id in customer_names:
                        setattr(item.product, "customer_name", customer_names[item.product_id])
                    if item.product and item.product_id in received_dates:
                        setattr(item.product, "received_date", received_dates[item.product_id])
        
        return transactions

    async def get_stats(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> transaction_schemas.TransactionStats:
        return await self.repository.get_stats(start_date=start_date, end_date=end_date)

    async def get_financial_stats(self, start_date: date, end_date: date):
        return await self.repository.get_financial_stats(start_date=start_date, end_date=end_date)

    async def get_transaction(self, transaction_id: int) -> Optional[Transaction]:
        return await self.repository.get(id=transaction_id)
      
    async def create_order(self, order_in: transaction_schemas.OrderCreate) -> Transaction:
        # Create Transaction logic is complex.
        # We need to manually construct the transaction object first
        
        # Handle timezone: Use server local time (Hanoi)
        tx_created = order_in.created_at or datetime.now()
        if tx_created.tzinfo is not None:
             # Convert to naive local time if aware
             tx_created = tx_created.astimezone(None).replace(tzinfo=None)

        # Calculate total amount to determine split if not explicit
        total_amount = sum(item.quantity * item.price for item in order_in.items)
        
        cash_amount = 0.0
        bank_transfer_amount = 0.0
        
        if order_in.payment_method == "mixed":
            cash_amount = order_in.cash_amount or 0.0
            bank_transfer_amount = order_in.bank_transfer_amount or 0.0
            # Optional: validate total matches cash + bank?
        elif order_in.payment_method == "cash":
            cash_amount = total_amount
        elif order_in.payment_method == "bank_transfer":
            bank_transfer_amount = total_amount

        transaction = Transaction(
            type=TransactionType.SALE,
            staff_id=order_in.staff_id,
            customer_id=order_in.customer_id,
            store_id=order_in.store_id,
            created_at=tx_created,
            payment_method=order_in.payment_method,
            cash_amount=cash_amount,
            bank_transfer_amount=bank_transfer_amount,
            transaction_code=await self._generate_transaction_code(tx_created)
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
                        product_code=await self.product_service.generate_product_code(item.product_type),
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
        tx_created = order_in.created_at or datetime.now()
        if tx_created.tzinfo is not None:
             tx_created = tx_created.astimezone(None).replace(tzinfo=None)

        transaction = Transaction(
            type=TransactionType.MANUFACTURER,
            staff_id=order_in.staff_id,
            store_id=order_in.store_id,
            created_at=tx_created,
            code=order_in.code,
            transaction_code=await self._generate_transaction_code(tx_created),
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
                
                # Update is_ordered to True and status to ORDERED for existing product
                update_data = {
                    "is_ordered": True,
                    "status": ProductStatus.ORDERED
                }
                update_schema = product_schemas.ProductUpdate(**update_data)
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
                        product_code=await self.product_service.generate_product_code(item.product_type),
                        status=ProductStatus.AVAILABLE,  # Default new items to 'Có sẵn'
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
        # Normalize tx_type so URL encoding (+ or %20 for space) matches DB enum value
        if tx_type:
            normalized = tx_type.replace("+", " ").strip()
            # Use enum value for known types so query always matches DB
            if normalized in (TransactionType.SALE.value, "sale", "SALE"):
                tx_type = TransactionType.SALE.value
            elif normalized in (t.value for t in TransactionType):
                tx_type = normalized
            else:
                tx_type = normalized
        transactions = await self.repository.get_by_customer(customer_id=customer_id, tx_type=tx_type)
        
        # Get linked statuses for sale transactions
        sale_ids = [t.id for t in transactions if t.type == TransactionType.SALE]
        if sale_ids:
            status_map = await self.repository.get_linked_statuses(sale_ids)
            
            # Populate order_status for each transaction
            for t in transactions:
                if t.id in status_map:
                    t.order_status = status_map[t.id]
        
        return transactions

    async def create_buyback(self, buyback_in: transaction_schemas.BuybackCreate) -> Transaction:
        """Create a buyback transaction - products become available again"""
        # Handle timezone
        tx_created = buyback_in.created_at or datetime.now()
        if tx_created.tzinfo is not None:
            tx_created = tx_created.astimezone(None).replace(tzinfo=None)

        # Get original transaction to link and get customer
        original_tx = await self.repository.get(id=buyback_in.original_transaction_id)
        if not original_tx:
            raise ValueError(f"Original transaction {buyback_in.original_transaction_id} not found")

        # Check if already processed (buyback or fulfilled)
        status_map = await self.repository.get_linked_statuses([original_tx.id])
        if original_tx.id in status_map:
            raise ValueError(f"Transaction {original_tx.id} has already been processed as {status_map[original_tx.id]}")

        transaction = Transaction(
            type=TransactionType.BUYBACK,
            staff_id=buyback_in.staff_id,
            store_id=buyback_in.store_id,
            customer_id=original_tx.customer_id,  # Same customer as original order
            created_at=tx_created,
            payment_method=buyback_in.payment_method,
            linked_transaction_id=buyback_in.original_transaction_id,
            transaction_code=await self._generate_transaction_code(tx_created)
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
        
        tx_created = fulfillment_in.created_at or datetime.now()
        if hasattr(tx_created, 'tzinfo') and tx_created.tzinfo is not None:
            tx_created = tx_created.astimezone(None).replace(tzinfo=None)

        # Get original transaction to link and get customer
        original_tx = await self.repository.get(id=fulfillment_in.original_transaction_id)
        if not original_tx:
            raise ValueError(f"Original transaction {fulfillment_in.original_transaction_id} not found")

        # Check if already processed (buyback or fulfilled)
        status_map = await self.repository.get_linked_statuses([original_tx.id])
        if original_tx.id in status_map:
            raise ValueError(f"Transaction {original_tx.id} has already been processed as {status_map[original_tx.id]}")

        transaction = Transaction(
            type=TransactionType.FULFILLMENT,
            staff_id=fulfillment_in.staff_id,
            store_id=fulfillment_in.store_id,
            customer_id=original_tx.customer_id,  # Same customer as original order
            created_at=tx_created,
            linked_transaction_id=fulfillment_in.original_transaction_id,
            transaction_code=await self._generate_transaction_code(tx_created)
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

    async def create_sell_back(self, sell_back_in: transaction_schemas.SellBackCreate) -> Transaction:
        """Create a sell-back transaction - products sold back to manufacturer"""
        tx_created = sell_back_in.created_at or datetime.now()
        if hasattr(tx_created, 'tzinfo') and tx_created.tzinfo is not None:
            tx_created = tx_created.astimezone(None).replace(tzinfo=None)

        # Get original manufacturer order transaction
        original_tx = await self.repository.get(id=sell_back_in.original_transaction_id)
        if not original_tx:
            raise ValueError(f"Original transaction {sell_back_in.original_transaction_id} not found")
        
        if original_tx.type != TransactionType.MANUFACTURER:
            raise ValueError(f"Transaction {original_tx.id} is not a manufacturer order")

        transaction = Transaction(
            type=TransactionType.SELL_BACK_MFR,
            staff_id=sell_back_in.staff_id,
            store_id=sell_back_in.store_id,
            created_at=tx_created,
            linked_transaction_id=sell_back_in.original_transaction_id,
            transaction_code=await self._generate_transaction_code(tx_created)
        )

        await self.repository.add_transaction(transaction)
        await self.repository.db.flush()

        for item in sell_back_in.items:
            product = await self.product_repository.get(id=item.product_id)
            if not product:
                raise ValueError(f"Product ID {item.product_id} not found")

            # Update product status to SOLD_BACK_MFR
            update_schema = product_schemas.ProductUpdate(
                status=ProductStatus.SOLD_BACK_MFR,
                last_price=item.sell_back_price
            )
            await self.product_repository.update(db_obj=product, obj_in=update_schema)

            # Create transaction item with sell-back price
            t_item = TransactionItem(
                transaction_id=transaction.id,
                product_id=product.id,
                price_at_time=item.sell_back_price
            )
            await self.repository.add_transaction_item(t_item)

        await self.repository.commit()
        await self.repository.refresh(transaction)
        return await self.repository.get(id=transaction.id)

    async def create_manufacturer_receive(self, receive_in: transaction_schemas.ManufacturerReceiveCreate) -> Transaction:
        """Create a manufacturer receive transaction - products received from manufacturer"""
        tx_created = receive_in.created_at or datetime.now()
        if hasattr(tx_created, 'tzinfo') and tx_created.tzinfo is not None:
            tx_created = tx_created.astimezone(None).replace(tzinfo=None)

        # Get original manufacturer order transaction
        original_tx = await self.repository.get(id=receive_in.original_transaction_id)
        if not original_tx:
            raise ValueError(f"Original transaction {receive_in.original_transaction_id} not found")
        
        if original_tx.type != TransactionType.MANUFACTURER:
            raise ValueError(f"Transaction {original_tx.id} is not a manufacturer order")

        transaction = Transaction(
            type=TransactionType.MANUFACTURER_RECEIVED,
            staff_id=receive_in.staff_id,
            store_id=receive_in.store_id,
            created_at=tx_created,
            linked_transaction_id=receive_in.original_transaction_id,
            transaction_code=await self._generate_transaction_code(tx_created)
        )

        await self.repository.add_transaction(transaction)
        await self.repository.db.flush()

        for item in receive_in.items:
            product = await self.product_repository.get(id=item.product_id)
            if not product:
                raise ValueError(f"Product ID {item.product_id} not found")

            # Update product status to RECEIVED_FROM_MFR
            # If price is provided, update it. Otherwise keep existing.
            update_data = {
                "status": ProductStatus.RECEIVED_FROM_MFR
            }
            if item.price is not None:
                update_data["last_price"] = item.price
                
            update_schema = product_schemas.ProductUpdate(**update_data)
            await self.product_repository.update(db_obj=product, obj_in=update_schema)

            # Create transaction item with price (new price or existing)
            price = item.price if item.price is not None else (product.last_price or 0)
            t_item = TransactionItem(
                transaction_id=transaction.id,
                product_id=product.id,
                price_at_time=price
            )
            await self.repository.add_transaction_item(t_item)

        await self.repository.commit()
        await self.repository.refresh(transaction)
        return await self.repository.get(id=transaction.id)

    async def create_swap(self, swap_in: transaction_schemas.SwapCreate) -> Transaction:
        """Create a swap transaction - swap two products between customers/inventory.
        
        Preserves history: the original sale TransactionItem keeps record of the
        original product (original_product_id) and is marked swapped=True, while
        product_id is updated to the replacement product. A SWAP transaction is
        created with customer_id and linked_transaction_id for full audit trail.
        
        Supports:
        - Sold <-> Available (customer gets a different product from inventory)
        - Sold <-> Sold (two customers swapping products)
        """
        tx_created = swap_in.created_at or datetime.now()
        if hasattr(tx_created, 'tzinfo') and tx_created.tzinfo is not None:
            tx_created = tx_created.astimezone(None).replace(tzinfo=None)

        p1 = await self.product_repository.get(id=swap_in.product_id_1)
        p2 = await self.product_repository.get(id=swap_in.product_id_2)

        if not p1 or not p2:
            raise ValueError("One or both products not found")

        customer_id = None
        linked_tx_id = None
        note_parts = []

        if p1.status == ProductStatus.SOLD and p2.status == ProductStatus.SOLD:
            # Case 1: Sold <-> Sold — two customers swapping products
            tx_item_1 = await self._get_active_sale_item(p1.id)
            tx_item_2 = await self._get_active_sale_item(p2.id)
            if not tx_item_1 or not tx_item_2:
                raise ValueError("Could not find active sale transactions for both products")

            # Mark both original sale items with swap history
            tx_item_1.original_product_id = p1.id
            tx_item_1.product_id = p2.id
            tx_item_1.swapped = True
            self.repository.db.add(tx_item_1)

            tx_item_2.original_product_id = p2.id
            tx_item_2.product_id = p1.id
            tx_item_2.swapped = True
            self.repository.db.add(tx_item_2)

            note_parts.append(f"SP #{p1.id} ↔ SP #{p2.id}")

        elif (p1.status == ProductStatus.SOLD and p2.status == ProductStatus.AVAILABLE) or \
             (p2.status == ProductStatus.SOLD and p1.status == ProductStatus.AVAILABLE):
            # Case 2: Sold <-> Available — customer gets a different product from inventory
            sold_p = p1 if p1.status == ProductStatus.SOLD else p2
            avail_p = p2 if p1.status == ProductStatus.SOLD else p1

            tx_item = await self._get_active_sale_item(sold_p.id)
            if not tx_item:
                raise ValueError(f"No active sale transaction found for product {sold_p.id}")

            # Preserve history on the original sale TransactionItem
            tx_item.original_product_id = sold_p.id
            tx_item.product_id = avail_p.id
            tx_item.swapped = True
            self.repository.db.add(tx_item)

            # Link swap to the customer's original sale transaction
            sale_tx = tx_item.transaction
            if sale_tx:
                customer_id = sale_tx.customer_id
                linked_tx_id = sale_tx.id

            # Update product statuses
            sold_update = product_schemas.ProductUpdate(
                status=ProductStatus.AVAILABLE,
                store_id=avail_p.store_id
            )
            await self.product_repository.update(db_obj=sold_p, obj_in=sold_update)

            avail_update = product_schemas.ProductUpdate(
                status=ProductStatus.SOLD,
                store_id=sold_p.store_id
            )
            await self.product_repository.update(db_obj=avail_p, obj_in=avail_update)

            note_parts.append(f"SP #{sold_p.id} → SP #{avail_p.id}")
        else:
            raise ValueError("Swap requires at least one SOLD product")

        # --- Create the SWAP transaction with full audit trail ---
        transaction = Transaction(
            type=TransactionType.SWAP,
            customer_id=customer_id,
            linked_transaction_id=linked_tx_id,
            staff_id=swap_in.staff_id,
            store_id=swap_in.store_id,
            created_at=tx_created,
            transaction_code=await self._generate_transaction_code(tx_created)
        )
        await self.repository.add_transaction(transaction)
        await self.repository.db.flush()

        # Record both products as transaction items
        for p in [p1, p2]:
            t_item = TransactionItem(
                transaction_id=transaction.id,
                product_id=p.id,
                price_at_time=p.last_price or 0
            )
            await self.repository.add_transaction_item(t_item)

        await self.repository.commit()
        await self.repository.refresh(transaction)
        return await self.repository.get(id=transaction.id)

    async def _get_active_sale_item(self, product_id: int):
        """Find the most recent SALE transaction item for a product."""
        from sqlalchemy import select as sa_select
        stmt = sa_select(TransactionItem).join(Transaction).where(
            TransactionItem.product_id == product_id,
            Transaction.type == TransactionType.SALE
        ).order_by(Transaction.created_at.desc()).limit(1)
        result = await self.repository.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _generate_transaction_code(self, created_at: datetime) -> str:
        # Format: HĐ-dd-mm-yyyy-xxxxx
        date_str = created_at.strftime("%d-%m-%Y")
        prefix = f"HĐ-{date_str}-"
        
        stmt = select(Transaction.transaction_code).where(
            Transaction.transaction_code.like(f"{prefix}%")
        ).order_by(Transaction.transaction_code.desc()).limit(1)
        
        result = await self.repository.db.execute(stmt)
        last_code = result.scalar_one_or_none()
        
        new_seq = 1
        if last_code:
            try:
                parts = last_code.split('-')
                new_seq = int(parts[-1]) + 1
            except ValueError:
                pass
                
        return f"{prefix}{new_seq:05d}"
                

    async def update_order(self, id: int, obj_in: transaction_schemas.OrderUpdate) -> Transaction:
        transaction = await self.repository.get(id=id)
        if not transaction:
             raise ValueError("Transaction not found")
        
        update_data = obj_in.model_dump(exclude_unset=True)
        if "created_at" in update_data and update_data["created_at"]:
             # Handle timezone
             tx_created = update_data["created_at"]
             if tx_created.tzinfo is not None:
                  update_data["created_at"] = tx_created.astimezone(None).replace(tzinfo=None)

        # Update transaction primitive fields
        for field in update_data:
             if hasattr(transaction, field):
                  setattr(transaction, field, update_data[field])

        await self.repository.commit()
        await self.repository.refresh(transaction)
        return transaction
    
    async def update_manufacturer_order(self, id: int, obj_in: transaction_schemas.ManufacturerOrderUpdate) -> Transaction:
        transaction = await self.repository.get(id=id)
        if not transaction:
             raise ValueError("Transaction not found")
        
        if transaction.type != TransactionType.MANUFACTURER:
             raise ValueError("Not a manufacturer order")

        update_data = obj_in.model_dump(exclude_unset=True)
        if "created_at" in update_data and update_data["created_at"]:
             # Handle timezone
             tx_created = update_data["created_at"]
             if tx_created.tzinfo is not None:
                  update_data["created_at"] = tx_created.astimezone(None).replace(tzinfo=None)

        for field in update_data:
             if hasattr(transaction, field):
                  setattr(transaction, field, update_data[field])
        
        await self.repository.commit()
        await self.repository.refresh(transaction)
        return transaction
