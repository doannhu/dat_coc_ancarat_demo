import pytest
import datetime
from app.modules.transactions.repository import TransactionRepository
from app.modules.products.repository import ProductRepository
from app.modules.transactions.service import TransactionService
from app.modules.transactions import schemas as transaction_schemas
from app.db.models import TransactionType, Store, Staff, Customer
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

# Helpers (recreated locally to be self-contained)
async def create_store(db: AsyncSession):
    store = Store(name=f"Test Store {uuid.uuid4()}", location="Loc", phone_number="123")
    db.add(store)
    await db.commit()
    await db.refresh(store)
    return store

async def create_staff(db: AsyncSession):
    staff = Staff(staff_name=f"Test Staff {uuid.uuid4()}", username=f"staff_{uuid.uuid4()}", role="staff")
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return staff

async def create_customer(db: AsyncSession):
    customer = Customer(name=f"Test Customer {uuid.uuid4()}", cccd=str(uuid.uuid4()), phone_number="0909")
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer

@pytest.mark.asyncio
async def test_buyback_allowed_flow(db_session: AsyncSession):
    """Test that buyback is allowed for a new sale order"""
    # Setup
    store = await create_store(db_session)
    staff = await create_staff(db_session)
    customer = await create_customer(db_session)
    
    prod_repo = ProductRepository(db_session)
    tx_repo = TransactionRepository(db_session)
    service = TransactionService(tx_repo, prod_repo)

    # 1. Create Sale Order (Allow)
    items = [
        transaction_schemas.OrderCreateItem(
            product_type="Gold Ring", quantity=1, price=5000000, is_new=True
        )
    ]
    order_in = transaction_schemas.OrderCreate(
        staff_id=staff.id, customer_id=customer.id, store_id=store.id, items=items
    )
    sale_tx = await service.create_order(order_in)
    assert sale_tx.id is not None
    assert sale_tx.type == TransactionType.SALE
    
    # Check status (should be None/processed=False)
    status_map = await tx_repo.get_linked_statuses([sale_tx.id])
    assert sale_tx.id not in status_map

    # 2. perform Buyback (Allow)
    # We need to construct Buyback items correctly
    bb_item = transaction_schemas.BuybackItem(
        product_id=sale_tx.items[0].product_id, buyback_price=4500000
    )
    bb_in = transaction_schemas.BuybackCreate(
        original_transaction_id=sale_tx.id,
        staff_id=staff.id,
        store_id=store.id,
        items=[bb_item]
    )
    bb_tx = await service.create_buyback(bb_in)
    assert bb_tx.id is not None
    assert bb_tx.type == TransactionType.BUYBACK
    
    # Check status (should be 'buyback')
    status_map = await tx_repo.get_linked_statuses([sale_tx.id])
    assert status_map[sale_tx.id] == 'Mua lại'

@pytest.mark.asyncio
async def test_buyback_not_allowed_if_already_processed(db_session: AsyncSession):
    """Test that buyback is NOT allowed if order is already processed"""
    # Setup
    store = await create_store(db_session)
    staff = await create_staff(db_session)
    customer = await create_customer(db_session)
    
    prod_repo = ProductRepository(db_session)
    tx_repo = TransactionRepository(db_session)
    service = TransactionService(tx_repo, prod_repo)

    # 1. Create Sale
    items = [transaction_schemas.OrderCreateItem(product_type="Gold Chain", quantity=1, price=10000000, is_new=True)]
    order_in = transaction_schemas.OrderCreate(staff_id=staff.id, customer_id=customer.id, store_id=store.id, items=items)
    sale_tx = await service.create_order(order_in)

    # 2. First Buyback (Success)
    bb_item = transaction_schemas.BuybackItem(product_id=sale_tx.items[0].product_id, buyback_price=9000000)
    bb_in = transaction_schemas.BuybackCreate(
        original_transaction_id=sale_tx.id, staff_id=staff.id, store_id=store.id, items=[bb_item]
    )
    await service.create_buyback(bb_in)

    # 3. Second Buyback (Fail)
    with pytest.raises(ValueError) as excinfo:
        await service.create_buyback(bb_in)
    assert "already been processed" in str(excinfo.value)

@pytest.mark.asyncio
async def test_fulfillment_allowed_flow(db_session: AsyncSession):
    """Test that fulfillment is allowed for a new sale order"""
    # Setup
    store = await create_store(db_session)
    staff = await create_staff(db_session)
    customer = await create_customer(db_session)
    prod_repo = ProductRepository(db_session)
    tx_repo = TransactionRepository(db_session)
    service = TransactionService(tx_repo, prod_repo)

    # 1. Create Sale
    items = [transaction_schemas.OrderCreateItem(product_type="Diamond", quantity=1, price=20000000, is_new=True)]
    order_in = transaction_schemas.OrderCreate(staff_id=staff.id, customer_id=customer.id, store_id=store.id, items=items)
    sale_tx = await service.create_order(order_in)

    # 2. Fulfill (Allow)
    ff_item = transaction_schemas.FulfillmentItem(product_id=sale_tx.items[0].product_id)
    ff_in = transaction_schemas.FulfillmentCreate(
        original_transaction_id=sale_tx.id, staff_id=staff.id, store_id=store.id, items=[ff_item]
    )
    ff_tx = await service.create_fulfillment(ff_in)
    
    assert ff_tx.id is not None
    assert ff_tx.type == TransactionType.FULFILLMENT
    
    # Check status
    status_map = await tx_repo.get_linked_statuses([sale_tx.id])
    assert status_map[sale_tx.id] == 'Đã giao'

@pytest.mark.asyncio
async def test_fulfillment_not_allowed_if_already_processed(db_session: AsyncSession):
    """Test that fulfillment/buyback is NOT allowed if order is already processed"""
    # Setup
    store = await create_store(db_session)
    staff = await create_staff(db_session)
    customer = await create_customer(db_session)
    prod_repo = ProductRepository(db_session)
    tx_repo = TransactionRepository(db_session)
    service = TransactionService(tx_repo, prod_repo)

    # 1. Create Sale
    items = [transaction_schemas.OrderCreateItem(product_type="Watch", quantity=1, price=5000000, is_new=True)]
    order_in = transaction_schemas.OrderCreate(staff_id=staff.id, customer_id=customer.id, store_id=store.id, items=items)
    sale_tx = await service.create_order(order_in)

    # 2. Fulfill (Success)
    ff_item = transaction_schemas.FulfillmentItem(product_id=sale_tx.items[0].product_id)
    ff_in = transaction_schemas.FulfillmentCreate(
        original_transaction_id=sale_tx.id, staff_id=staff.id, store_id=store.id, items=[ff_item]
    )
    await service.create_fulfillment(ff_in)

    # 3. Try Buyback (Fail - because already fulfilled)
    bb_item = transaction_schemas.BuybackItem(product_id=sale_tx.items[0].product_id, buyback_price=4000000)
    bb_in = transaction_schemas.BuybackCreate(
        original_transaction_id=sale_tx.id, staff_id=staff.id, store_id=store.id, items=[bb_item]
    )
    
    with pytest.raises(ValueError) as excinfo:
        await service.create_buyback(bb_in)
    assert "already been processed" in str(excinfo.value)

    # 4. Try Fulfill Again (Fail)
    with pytest.raises(ValueError) as excinfo:
        await service.create_fulfillment(ff_in)
    assert "already been processed" in str(excinfo.value)
