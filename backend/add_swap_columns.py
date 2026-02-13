"""Add swap tracking columns to transaction_items table."""
import asyncio
from sqlalchemy import text
from app.db.session import async_session_maker

async def add_swap_columns():
    async with async_session_maker() as session:
        print("Adding swap tracking columns to transaction_items...")
        try:
            await session.execute(text(
                "ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS swapped BOOLEAN DEFAULT FALSE;"
            ))
            print("  Added 'swapped' column.")

            await session.execute(text(
                "ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS original_product_id INTEGER REFERENCES products(id);"
            ))
            print("  Added 'original_product_id' column.")

            await session.commit()
            print("Done. Schema updated successfully.")
        except Exception as e:
            print(f"Error: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(add_swap_columns())
