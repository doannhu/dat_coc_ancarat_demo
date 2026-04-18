import asyncio
from sqlalchemy import text
from app.db.session import async_session_maker

async def add_kc_column():
    async with async_session_maker() as session:
        print("Adding delivered_to_kc column to transactions...")
        try:
            await session.execute(text(
                "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS delivered_to_kc BOOLEAN DEFAULT FALSE;"
            ))
            print("  Added 'delivered_to_kc' column.")

            await session.commit()
            print("Done. Schema updated successfully.")
        except Exception as e:
            print(f"Error: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(add_kc_column())
