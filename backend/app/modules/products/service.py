from typing import List, Optional
from .repository import ProductRepository
from . import schemas
from app.db.models import Product

class ProductService:
    def __init__(self, repository: ProductRepository):
        self.repository = repository

    async def get_product(self, product_id: int) -> Optional[Product]:
        return await self.repository.get(id=product_id)

    async def get_products(self, skip: int = 0, limit: int = 100) -> List[schemas.Product]:
        products = await self.repository.get_multi(skip=skip, limit=limit)
        # Manually flatten data if needed, or rely on properties
        for p in products:
             # Find the SALE transaction
            # Using viewonly relation `transactions` which returns Transaction objects.
            # We eager loaded store and customer for transactions.
            sale_tx = next((t for t in p.transactions if t.type == 'sale'), None)
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
        return products

    async def move_product(self, product_id: int, new_store_id: int) -> Product:
        """Move a product to a different store"""
        product = await self.repository.get(id=product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        if product.status != 'available':
            raise ValueError(f"Only available products can be moved")
        
        update_data = schemas.ProductUpdate(store_id=new_store_id)
        return await self.repository.update(db_obj=product, obj_in=update_data)

    async def create_product(self, product_in: schemas.ProductCreate) -> Product:
        return await self.repository.create(obj_in=product_in)

    async def update_product(self, db_obj: Product, product_in: schemas.ProductUpdate) -> Product:
        return await self.repository.update(db_obj=db_obj, obj_in=product_in)

    async def delete_product(self, product_id: int):
        return await self.repository.remove(id=product_id)

    async def get_pending_manufacturer_order(self) -> List[schemas.Product]:
        """Get products from customer orders not yet ordered from manufacturer"""
        products = await self.repository.get_pending_manufacturer_order()
        for p in products:
            p.store_name = p.store.name if p.store else None
            # Get customer info from the sale transaction
            sale_tx = next((t for t in p.transactions if t.type == 'sale'), None)
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
