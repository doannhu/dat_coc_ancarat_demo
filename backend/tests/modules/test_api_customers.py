import pytest
from httpx import AsyncClient

# --- Customer Tests ---
@pytest.mark.asyncio
async def test_create_customer(client: AsyncClient):
    response = await client.post(
        "/api/v1/customers/",
        json={"name": "Test Customer", "cccd": "123456789", "phone_number": "0909090909", "address": "Test Address"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Customer"
    assert "id" in data

@pytest.mark.asyncio
async def test_read_customers(client: AsyncClient):
    # Ensure one customer exists (from previous test or create new)
    await client.post(
        "/api/v1/customers/",
        json={"name": "Customer 2", "phone_number": "111"}
    )
    
    response = await client.get("/api/v1/customers/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

@pytest.mark.asyncio
async def test_read_customer_by_id(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/customers/",
        json={"name": "Customer 3", "phone_number": "222"}
    )
    customer_id = create_res.json()["id"]

    # Read
    response = await client.get(f"/api/v1/customers/{customer_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Customer 3"

@pytest.mark.asyncio
async def test_update_customer(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/customers/",
        json={"name": "Old Name", "phone_number": "333"}
    )
    customer_id = create_res.json()["id"]

    # Update
    update_res = await client.put(
        f"/api/v1/customers/{customer_id}",
        json={"name": "New Name"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "New Name"

    # Verify
    get_res = await client.get(f"/api/v1/customers/{customer_id}")
    assert get_res.json()["name"] == "New Name"

@pytest.mark.asyncio
async def test_delete_customer(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/customers/",
        json={"name": "To Delete", "phone_number": "444"}
    )
    customer_id = create_res.json()["id"]

    # Delete
    del_res = await client.delete(f"/api/v1/customers/{customer_id}")
    assert del_res.status_code == 200

    # Verify 404
    get_res = await client.get(f"/api/v1/customers/{customer_id}")
    assert get_res.status_code == 404
