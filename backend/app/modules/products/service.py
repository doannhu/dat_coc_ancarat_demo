from typing import List, Optional
import asyncio
from sqlalchemy import select
from .repository import ProductRepository
from . import schemas
from app.db.models import Product, TransactionType, ProductStatus, TransactionItem, Transaction

class ProductService:
    def __init__(self, repository: ProductRepository):
        self.repository = repository

    async def get_product(self, product_id: int) -> Optional[Product]:
        product = await self.repository.get(id=product_id)
        if product:
             # Populate store_name
            if product.store:
                product.store_name = product.store.name

            # Find latest SALE transaction to get customer info
            sale_txs = [t for t in product.transactions if t.type == TransactionType.SALE]
            if sale_txs:
                # Sort by created_at desc
                sale_txs.sort(key=lambda x: x.created_at, reverse=True)
                sale_tx = sale_txs[0]
                
                product.customer_name = sale_tx.customer.name if sale_tx.customer else None
                product.order_date = sale_tx.created_at
                
        return product

    async def generate_product_code(self, product_type: str, created_at: Optional['datetime'] = None) -> str:
        # Format: XX-DD-MM-YYYY-ZZZZZ
        # XX: 1L (1 lượng), 5L (5 lượng), 1K (1 kg)
        from datetime import datetime
        now = created_at or datetime.now()
        date_str = now.strftime("%d-%m-%Y")
        
        type_map = {
            "1 lượng": "1L",
            "5 lượng": "5L",
            "1 kg": "1K"
        }
        # default to first 2 chars upper if not in map
        code_prefix = type_map.get(product_type, product_type[:2].upper())
        
        prefix = f"{code_prefix}-{date_str}-"
        
        # Get last sequence for this prefix
        stmt = select(Product.product_code).where(
            Product.product_code.like(f"{prefix}%")
        ).order_by(Product.product_code.desc()).limit(1)
        
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


    ## NOTE: swap_products moved to TransactionService for proper audit tracking

    async def get_products(self, skip: int = 0, limit: int = 100) -> List[schemas.Product]:
        products = await self.repository.get_multi(skip=skip, limit=limit)
        # Manually flatten data if needed, or rely on properties
        for p in products:
             # Find the SALE transaction
            # Using viewonly relation `transactions` which returns Transaction objects.
            # We eager loaded store and customer for transactions.
            sale_tx = next((t for t in p.transactions if t.type == TransactionType.SALE), None)
            if sale_tx:
                p.customer_name = sale_tx.customer.name if sale_tx.customer else None
                p.order_date = sale_tx.created_at
                p.store_name = sale_tx.store.name if sale_tx.store else None
        return products

    async def get_available_products(self, skip: int = 0, limit: int = 100) -> List[schemas.Product]:
        """Get available products with store name"""
        products = await self.repository.get_available(skip=skip, limit=limit)
        for p in products:
            p.store_name = p.store.name if p.store else None
        return products

    async def get_available_by_store(self, store_id: int) -> List[schemas.Product]:
        """Get available products for a specific store"""
        products = await self.repository.get_available_by_store(store_id=store_id)
        for p in products:
            p.store_name = p.store.name if p.store else None
            # Find the most recent transaction to link
            if getattr(p, 'transactions', None):
                sorted_txs = sorted(p.transactions, key=lambda x: x.created_at, reverse=True)
                latest_tx = sorted_txs[0]
                p.transaction_code = latest_tx.code
                p.order_date = latest_tx.created_at
        return products

    async def move_product(self, product_id: int, new_store_id: int) -> Product:
        """Move a product to a different store"""
        product = await self.repository.get(id=product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        if product.status != ProductStatus.AVAILABLE:
            raise ValueError(f"Only available products can be moved")
        
        update_data = schemas.ProductUpdate(store_id=new_store_id)
        return await self.repository.update(db_obj=product, obj_in=update_data)

    async def create_product(self, product_in: schemas.ProductCreate) -> Product:
        return await self.repository.create(obj_in=product_in)

    async def update_product(self, db_obj: Product, product_in: schemas.ProductUpdate) -> Product:
        return await self.repository.update(db_obj=db_obj, obj_in=product_in)

    async def delete_product(self, product_id: int):
        return await self.repository.remove(id=product_id)

    async def get_status_info(self, product_ids: List[int]) -> List[schemas.ProductStatusInfo]:
        """Get detailed status info (Sale/Buyback/Swap history) for products"""
        if not product_ids:
            return []
            
        # Get products with transactions eagerly loaded
        products = await asyncio.gather(*[self.repository.get(pid) for pid in product_ids])

        # Products swapped out have original_product_id set on the SALE item, not on SWAP items.
        # Find TransactionItems with original_product_id in product_ids (these are in SALE txns),
        # then find the SWAP transaction linked to that sale (linked_transaction_id = sale.id).
        item_stmt = (
            select(TransactionItem.original_product_id, TransactionItem.transaction_id)
            .where(
                TransactionItem.original_product_id.in_(product_ids),
                TransactionItem.original_product_id.isnot(None)
            )
        )
        item_result = await self.repository.db.execute(item_stmt)
        item_rows = item_result.all()
        sale_ids = {row.transaction_id for row in item_rows}
        orig_to_sale = {row.original_product_id: row.transaction_id for row in item_rows}

        swap_by_product = {}
        if sale_ids:
            swap_stmt = (
                select(Transaction)
                .where(
                    Transaction.type == TransactionType.SWAP,
                    Transaction.linked_transaction_id.in_(sale_ids)
                )
                .order_by(Transaction.created_at.desc())
            )
            swap_result = await self.repository.db.execute(swap_stmt)
            swap_txs = swap_result.scalars().all()
            sale_to_swap = {tx.linked_transaction_id: tx for tx in swap_txs}
            for orig_pid, sale_id in orig_to_sale.items():
                if sale_id in sale_to_swap:
                    swap_by_product[orig_pid] = sale_to_swap[sale_id]

        results = []
        for p in products:
            if not p:
                continue
                
            info = schemas.ProductStatusInfo(id=p.id, status=p.status)
            
            # SALE (Sold to Customer)
            sales = [t for t in p.transactions if t.type == TransactionType.SALE]
            sales.sort(key=lambda x: x.created_at, reverse=True)
            latest_sale = sales[0] if sales else None
            
            if latest_sale:
                info.sale_info = schemas.BuybackInfo(
                    transaction_code=latest_sale.transaction_code or latest_sale.code,
                    created_at=latest_sale.created_at,
                    customer_name=latest_sale.customer.name if latest_sale.customer else None
                )
            
            # BUYBACK (Bought back from Customer)
            buybacks = [t for t in p.transactions if t.type == TransactionType.BUYBACK]
            buybacks.sort(key=lambda x: x.created_at, reverse=True)
            latest_buyback = buybacks[0] if buybacks else None
            
            if latest_buyback:
                # Don't show buyback as "current" if product is currently SOLD (e.g. swapped into another sale)
                is_curr_buyback = p.status != ProductStatus.SOLD
                if latest_sale and latest_buyback.created_at < latest_sale.created_at:
                    is_curr_buyback = False
                if is_curr_buyback:
                    info.buyback_info = schemas.BuybackInfo(
                        transaction_code=latest_buyback.transaction_code or latest_buyback.code,
                        created_at=latest_buyback.created_at,
                        customer_name=latest_buyback.customer.name if latest_buyback.customer else None
                    )

            # SWAP (Returned to inventory via swap) — show info for products that came back via swap
            if p.status == ProductStatus.AVAILABLE and p.id in swap_by_product:
                swap_tx = swap_by_product[p.id]
                info.swap_info = schemas.BuybackInfo(
                    transaction_code=swap_tx.transaction_code or swap_tx.code,
                    created_at=swap_tx.created_at,
                    customer_name="Hoán đổi"
                )
            
            results.append(info)
            
        return results

    async def get_pending_manufacturer_order(self) -> List[schemas.Product]:
        """Get products from customer orders not yet ordered from manufacturer"""
        products = await self.repository.get_pending_manufacturer_order()
        for p in products:
            p.store_name = p.store.name if p.store else None
            # Get customer info from the sale transaction
            sale_tx = next((t for t in p.transactions if t.type == TransactionType.SALE), None)
            if sale_tx:
                p.customer_name = sale_tx.customer.name if sale_tx.customer else None
                p.order_date = sale_tx.created_at
        return products

    async def update_delivery_status_batch(self, updates: List[dict]) -> List[Product]:
        """Batch update delivery status for multiple products.
        
        Args:
            updates: List of dicts with product_id and is_delivered
        
        Returns:
            List of updated products
        """
        updated_products = []
        for update in updates:
            product = await self.repository.get(id=update['product_id'])
            if product:
                update_data = schemas.ProductUpdate(is_delivered=update['is_delivered'])
                updated = await self.repository.update(db_obj=product, obj_in=update_data)
                updated_products.append(updated)
        return updated_products
