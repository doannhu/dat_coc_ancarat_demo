import asyncio
from app.db.session import async_session_maker
from app.modules.staff.repository import StaffRepository
from app.modules.staff.schemas import StaffCreate
from app.modules.stores.repository import StoreRepository
from app.modules.stores.schemas import StoreCreate

async def init_data():
    # Use async_session_maker directly as a context manager (it requires instantiation first if not already instantiated in imports)
    # session.py defines: async_session_maker = async_sessionmaker(...)
    # So we call it to get a session.
    async with async_session_maker() as db:
        print("Initializing data...")
        
        # --- Initialize Staff ---
        staff_repo = StaffRepository(db)
        
        # Check if Admin exists
        existing_admins = await staff_repo.get_multi()
        admin_exists = any(s.username == "admin" for s in existing_admins)
        
        if not admin_exists:
            print("Creating Admin user...")
            admin_in = StaffCreate(
                staff_name="Admin",
                username="admin",
                password="1234",
                role="admin"
            )
            await staff_repo.create(obj_in=admin_in)
        else:
            print("Admin user already exists.")

        # Check if Staff exists (username "nhanvien" for "nhân viên")
        nhanvien_exists = any(s.username == "nhanvien" for s in existing_admins)
        
        if not nhanvien_exists:
            print("Creating Staff user...")
            staff_in = StaffCreate(
                staff_name="Nhân Viên",
                username="nhanvien",
                password="1",
                role="staff"
            )
            await staff_repo.create(obj_in=staff_in)
        else:
            print("Staff user already exists.")

        # --- Initialize Stores ---
        store_repo = StoreRepository(db)
        existing_stores = await store_repo.get_multi()
        
        # Store 1: Hoa Tùng
        hoa_tung_exists = any(s.name == "Hoa Tùng" for s in existing_stores)
        if not hoa_tung_exists:
            print("Creating Store Hoa Tùng...")
            store1 = StoreCreate(
                name="Hoa Tùng",
                location="154 Nguyễn Thuỵ, Quang Ngai, Vietnam",
                phone_number="+84 70 807 7229"
            )
            await store_repo.create(obj_in=store1)
        else:
             print("Store Hoa Tùng already exists.")

        # Store 2: Kim Châu
        kim_chau_exists = any(s.name == "Kim Châu" for s in existing_stores)
        if not kim_chau_exists:
            print("Creating Store Kim Châu...")
            store2 = StoreCreate(
                name="Kim Châu",
                location="27 Hùng Vương, Phường Cẩm Thành, Thành Phố Quảng Ngãi, Quang Ngai, Vietnam",
                phone_number="+84 32 931 8849"
            )
            await store_repo.create(obj_in=store2)
        else:
             print("Store Kim Châu already exists.")

        print("Data initialization complete.")

if __name__ == "__main__":
    asyncio.run(init_data())
