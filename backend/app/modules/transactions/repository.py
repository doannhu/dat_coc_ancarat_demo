from datetime import date, datetime
from typing import Optional, List, Dict
from sqlalchemy import select, extract, cast, Date, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Transaction, TransactionItem, Product, Customer, Store, Staff, TransactionType
from . import schemas as transaction_schema

class TransactionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: int):
        # Eager load items and relationships
        query = select(Transaction).options(
            selectinload(Transaction.items).options(
                selectinload(TransactionItem.product).selectinload(Product.store),
                selectinload(TransactionItem.original_product),
            ),
            selectinload(Transaction.customer),
            selectinload(Transaction.store),
            selectinload(Transaction.staff)
        ).where(Transaction.id == id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi(self, skip: int = 0, limit: int = 100, start_date: Optional[date] = None, end_date: Optional[date] = None, tx_type: Optional[str] = None):
        # Eager load items and relationships
        query = select(Transaction).options(
            selectinload(Transaction.items).options(
                selectinload(TransactionItem.product).selectinload(Product.store),
                selectinload(TransactionItem.original_product),
            ),
            selectinload(Transaction.customer),
            selectinload(Transaction.store),
            selectinload(Transaction.staff)
        )
        
        if tx_type:
            query = query.where(Transaction.type == tx_type)
        
        if start_date:
            # Cast to Date for accurate comparison ignoring time
            query = query.where(func.date(Transaction.created_at) >= start_date)
            
        if end_date:
            query = query.where(func.date(Transaction.created_at) <= end_date)
            
        # Order by newest first
        query = query.order_by(Transaction.created_at.desc())

        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, obj_in: transaction_schema.TransactionCreate):
        # This is basic create. Complex logic is in Service.
        pass

    async def add_transaction(self, transaction: Transaction):
        self.db.add(transaction)
        await self.db.flush() # Populate ID but don't commit yet

    async def add_transaction_item(self, item: TransactionItem):
        self.db.add(item)
        
    async def commit(self):
        await self.db.commit()

    async def refresh(self, obj):
        await self.db.refresh(obj)

    async def get_by_customer(self, customer_id: int, tx_type: str = None):
        """Get transactions by customer ID, optionally filtered by type"""
        query = select(Transaction).options(
            selectinload(Transaction.items).options(
                selectinload(TransactionItem.product).selectinload(Product.store),
                selectinload(TransactionItem.original_product),
            ),
            selectinload(Transaction.customer),
            selectinload(Transaction.store),
            selectinload(Transaction.staff)
        ).where(Transaction.customer_id == customer_id)
        
        if tx_type:
            query = query.where(Transaction.type == tx_type)
        
        query = query.order_by(Transaction.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_linked_statuses(self, transaction_ids: list):
        """Get linked transaction types (buyback/fulfillment) for given transaction IDs.
        Returns a dict: {original_tx_id: status_type}
        """
        if not transaction_ids:
            return {}
        
        # Find transactions that link to any of the given IDs
        query = select(
            Transaction.linked_transaction_id,
            Transaction.type
        ).where(
            Transaction.linked_transaction_id.in_(transaction_ids),
            Transaction.type.in_([
                TransactionType.BUYBACK, 
                TransactionType.FULFILLMENT, 
                TransactionType.SELL_BACK_MFR,
                TransactionType.MANUFACTURER_RECEIVED
            ])
        )
        
        result = await self.db.execute(query)
        rows = result.all()
        
        # Build status map - prioritize buyback over fulfillment if both exist
        status_map = {}
        for linked_id, tx_type in rows:
            status_val = 'Đã giao' if tx_type == TransactionType.FULFILLMENT else tx_type
            
            if linked_id not in status_map:
                status_map[linked_id] = status_val
            elif tx_type == TransactionType.BUYBACK:
                # Buyback takes priority
                status_map[linked_id] = status_val
        
        return status_map

    async def get_product_customer_names(self, product_ids: List[int]) -> Dict[int, str]:
        """For each product_id, get the customer name from the latest SALE transaction that has this product."""
        if not product_ids:
            return {}
        # Subquery: latest sale transaction per product (by item.product_id)
        subq = (
            select(
                TransactionItem.product_id,
                Transaction.customer_id,
                func.row_number().over(
                    partition_by=TransactionItem.product_id,
                    order_by=Transaction.created_at.desc()
                ).label("rn"),
            )
            .select_from(TransactionItem)
            .join(Transaction, Transaction.id == TransactionItem.transaction_id)
            .where(
                TransactionItem.product_id.in_(product_ids),
                Transaction.type == TransactionType.SALE,
            )
        )
        subq = subq.subquery()
        query = (
            select(subq.c.product_id, Customer.name)
            .outerjoin(Customer, Customer.id == subq.c.customer_id)
            .where(subq.c.rn == 1)
        )
        result = await self.db.execute(query)
        return {row.product_id: (row.name or "") for row in result.all()}

    async def get_product_received_dates(self, product_ids: List[int]) -> Dict[int, datetime]:
        """For each product_id, get the created_at from the latest MANUFACTURER_RECEIVED transaction that has this product."""
        if not product_ids:
            return {}
        subq = (
            select(
                TransactionItem.product_id,
                Transaction.created_at,
                func.row_number().over(
                    partition_by=TransactionItem.product_id,
                    order_by=Transaction.created_at.desc()
                ).label("rn"),
            )
            .select_from(TransactionItem)
            .join(Transaction, Transaction.id == TransactionItem.transaction_id)
            .where(
                TransactionItem.product_id.in_(product_ids),
                Transaction.type == TransactionType.MANUFACTURER_RECEIVED,
            )
        )
        subq = subq.subquery()
        query = (
            select(subq.c.product_id, subq.c.created_at)
            .where(subq.c.rn == 1)
        )
        result = await self.db.execute(query)
        return {row.product_id: row.created_at for row in result.all()}

    async def get_stats(self, start_date: Optional[date] = None, end_date: Optional[date] = None):
        # Base query for Sales
        base_query = select(Transaction).where(Transaction.type == TransactionType.SALE)
        
        if start_date:
            base_query = base_query.where(cast(Transaction.created_at, Date) >= start_date)
        if end_date:
            base_query = base_query.where(cast(Transaction.created_at, Date) <= end_date)

        # 1. Total Orders
        total_orders_query = select(func.count()).select_from(base_query.subquery())
        total_orders = (await self.db.execute(total_orders_query)).scalar_one()

        # 2. Total Revenue (sum of items price)
        # Assuming we need to join TransactionItem
        revenue_query = select(func.sum(TransactionItem.price_at_time))\
            .join(Transaction, TransactionItem.transaction_id == Transaction.id)\
            .where(Transaction.type == TransactionType.SALE)
            
        if start_date:
            revenue_query = revenue_query.where(cast(Transaction.created_at, Date) >= start_date)
        if end_date:
            revenue_query = revenue_query.where(cast(Transaction.created_at, Date) <= end_date)

        total_revenue = (await self.db.execute(revenue_query)).scalar() or 0.0

        # 3. By Payment Method
        pm_query = select(Transaction.payment_method, func.sum(TransactionItem.price_at_time))\
            .join(TransactionItem, TransactionItem.transaction_id == Transaction.id)\
            .where(Transaction.type == TransactionType.SALE)\
            .group_by(Transaction.payment_method)

        if start_date:
            pm_query = pm_query.where(cast(Transaction.created_at, Date) >= start_date)
        if end_date:
            pm_query = pm_query.where(cast(Transaction.created_at, Date) <= end_date)
            
        pm_results = (await self.db.execute(pm_query)).all()
        payment_method_stats = {row[0] or "unknown": row[1] or 0.0 for row in pm_results}

        # 4. By Store
        store_query = select(Store.name, func.count(Transaction.id.distinct()), func.sum(TransactionItem.price_at_time))\
            .join(Transaction, Transaction.store_id == Store.id)\
            .join(TransactionItem, TransactionItem.transaction_id == Transaction.id)\
            .where(Transaction.type == TransactionType.SALE)\
            .group_by(Store.name)

        if start_date:
            store_query = store_query.where(cast(Transaction.created_at, Date) >= start_date)
        if end_date:
            store_query = store_query.where(cast(Transaction.created_at, Date) <= end_date)

        store_results = (await self.db.execute(store_query)).all()
        store_stats = [
            {"store_name": row[0], "total_orders": row[1], "revenue": row[2] or 0.0}
            for row in store_results
        ]

        return {
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "payment_method_stats": payment_method_stats,
            "store_stats": store_stats
        }

    async def get_financial_stats(self, start_date: date, end_date: date):
        # Money In: SALE + SELL_BACK_MFR
        async def get_sum(tx_types):
            query = select(func.sum(TransactionItem.price_at_time))\
                .join(Transaction, TransactionItem.transaction_id == Transaction.id)\
                .where(Transaction.type.in_(tx_types))\
                .where(cast(Transaction.created_at, Date) >= start_date)\
                .where(cast(Transaction.created_at, Date) <= end_date)
            
            return (await self.db.execute(query)).scalar() or 0.0

        sale_total = await get_sum([TransactionType.SALE])
        sell_back_mfr_total = await get_sum([TransactionType.SELL_BACK_MFR])
        
        # Correctly evaluate cash_in and bank_in for mixed and legacy
        query = select(Transaction)\
            .where(Transaction.type.in_([TransactionType.SALE, TransactionType.SELL_BACK_MFR]))\
            .where(cast(Transaction.created_at, Date) >= start_date)\
            .where(cast(Transaction.created_at, Date) <= end_date)\
            .options(selectinload(Transaction.items))
        
        result = await self.db.execute(query)
        transactions = result.scalars().all()
        
        cash_in = 0.0
        bank_in = 0.0
        
        for t in transactions:
            total_items_price = sum(item.price_at_time or 0.0 for item in t.items)
            if t.payment_method == "mixed":
                cash_in += t.cash_amount or 0.0
                bank_in += t.bank_transfer_amount or 0.0
            elif t.payment_method == "cash":
                cash_in += total_items_price
            elif t.payment_method == "bank_transfer":
                bank_in += total_items_price

        # Money Out: BUYBACK + MANUFACTURER
        buyback_total = await get_sum([TransactionType.BUYBACK])
        manufacturer_order_total = await get_sum([TransactionType.MANUFACTURER])
        
        return {
            "money_in": sale_total + sell_back_mfr_total,
            "money_in_breakdown": {
                "customer_order": sale_total,
                "sell_to_mfr": sell_back_mfr_total,
                "cash": cash_in,
                "bank_transfer": bank_in
            },
            "money_out": buyback_total + manufacturer_order_total,
            "money_out_breakdown": {
                "buy_back_customer": buyback_total,
                "order_from_mfr": manufacturer_order_total
            }
        }
