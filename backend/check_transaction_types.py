import asyncio
from sqlalchemy import text
from app.db.session import async_session_maker

async def check_dates():
    async with async_session_maker() as session:
        print("Checking recent Manufacturer Orders...")
        result = await session.execute(text("SELECT id, created_at, type FROM transactions WHERE type = 'Đặt hàng NSX' ORDER BY created_at DESC LIMIT 5"))
        rows = result.all()
        for row in rows:
            print(f"ID: {row[0]}, Created: {row[1]}, Type: {row[2]}")

if __name__ == "__main__":
    asyncio.run(check_dates())
