import pytest
from httpx import AsyncClient

# --- Store Tests ---
@pytest.mark.asyncio
async def test_create_store(client: AsyncClient):
    response = await client.post(
        "/api/v1/stores/",
        json={"name": "Test Store", "location": "Test Location", "phone_number": "123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Store"
    assert "id" in data

@pytest.mark.asyncio
async def test_read_stores(client: AsyncClient):
    # Ensure one store exists
    await client.post(
        "/api/v1/stores/",
        json={"name": "Store 2", "location": "Loc 1", "phone_number": "111"}
    )
    
    response = await client.get("/api/v1/stores/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

@pytest.mark.asyncio
async def test_read_store_by_id(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/stores/",
        json={"name": "Store By ID", "location": "Loc 2", "phone_number": "222"}
    )
    store_id = create_res.json()["id"]

    # Read
    response = await client.get(f"/api/v1/stores/{store_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Store By ID"

@pytest.mark.asyncio
async def test_update_store(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/stores/",
        json={"name": "Old Store", "location": "Old Loc", "phone_number": "333"}
    )
    store_id = create_res.json()["id"]

    # Update
    update_res = await client.put(
        f"/api/v1/stores/{store_id}",
        json={"name": "New Store Name"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "New Store Name"

    # Verify
    get_res = await client.get(f"/api/v1/stores/{store_id}")
    assert get_res.json()["name"] == "New Store Name"

@pytest.mark.asyncio
async def test_delete_store(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/stores/",
        json={"name": "Store To Delete", "location": "Loc Del", "phone_number": "444"}
    )
    store_id = create_res.json()["id"]

    # Delete
    del_res = await client.delete(f"/api/v1/stores/{store_id}")
    assert del_res.status_code == 200

    # Verify 404
    get_res = await client.get(f"/api/v1/stores/{store_id}")
    assert get_res.status_code == 404
