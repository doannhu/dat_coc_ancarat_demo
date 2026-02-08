import pytest
from httpx import AsyncClient

# --- Staff Tests ---
@pytest.mark.asyncio
async def test_create_staff(client: AsyncClient):
    response = await client.post(
        "/api/v1/staff/",
        json={"staff_name": "Test Staff", "username": "staff1", "password": "password123", "role": "admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["staff_name"] == "Test Staff"
    assert "id" in data
    # Password should generally not be returned or checked directly in response for security, but we verify fields exist.

@pytest.mark.asyncio
async def test_read_staffs(client: AsyncClient):
    # Ensure one staff exists
    await client.post(
        "/api/v1/staff/",
        json={"staff_name": "Staff 2", "username": "staff2", "password": "abc", "role": "user"}
    )
    
    response = await client.get("/api/v1/staff/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

@pytest.mark.asyncio
async def test_read_staff_by_id(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/staff/",
        json={"staff_name": "Staff By ID", "username": "staff_id_test", "password": "123", "role": "user"}
    )
    staff_id = create_res.json()["id"]

    # Read
    response = await client.get(f"/api/v1/staff/{staff_id}")
    assert response.status_code == 200
    assert response.json()["staff_name"] == "Staff By ID"

@pytest.mark.asyncio
async def test_update_staff(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/staff/",
        json={"staff_name": "Old Staff", "username": "staff3", "password": "old", "role": "manager"}
    )
    staff_id = create_res.json()["id"]

    # Update
    update_res = await client.put(
        f"/api/v1/staff/{staff_id}",
        json={"staff_name": "New Staff Name"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["staff_name"] == "New Staff Name"

    # Verify
    get_res = await client.get(f"/api/v1/staff/{staff_id}")
    assert get_res.json()["staff_name"] == "New Staff Name"

@pytest.mark.asyncio
async def test_delete_staff(client: AsyncClient):
    # Create
    create_res = await client.post(
        "/api/v1/staff/",
        json={"staff_name": "Staff To Delete", "username": "staff4", "password": "del", "role": "temp"}
    )
    staff_id = create_res.json()["id"]

    # Delete
    del_res = await client.delete(f"/api/v1/staff/{staff_id}")
    assert del_res.status_code == 200

    # Verify 404
    get_res = await client.get(f"/api/v1/staff/{staff_id}")
    assert get_res.status_code == 404
