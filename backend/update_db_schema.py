import asyncio
import os
from sqlalchemy import text
from app.db.session import async_session_maker

async def update_schema():
    async with async_session_maker() as session:
        print("Starting schema update for cash/bank split...")
        try:
            # Add columns. Using "IF NOT EXISTS" is PostgreSQL specific but safe since we know it's Postgres.
            print("Adding cash_amount column...")
            await session.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cash_amount FLOAT DEFAULT 0;"))
            
            print("Adding bank_transfer_amount column...")
            await session.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_transfer_amount FLOAT DEFAULT 0;"))
            
            await session.commit()
            print("Database schema updated successfully.")
            
        except Exception as e:
            print(f"Error updating schema: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(update_schema())
