import asyncio
from sqlalchemy import text
from app.db.session import async_session_maker

async def update_schema():
    async with async_session_maker() as session:
        print("Updating database schema...")
        try:
            # 1. Try to rename 'code' to 'transaction_code'
            try:
                print("Attempting to rename 'code' to 'transaction_code'...")
                await session.execute(text("ALTER TABLE transactions RENAME COLUMN code TO transaction_code;"))
                print("Renamed 'code' to 'transaction_code'.")
            except Exception as e:
                # Likely 'code' column does not exist
                print(f"Rename failed (maybe 'code' column doesn't exist): {e}")
                
                # 2. Try to add 'transaction_code' if it doesn't exist
                print("Attempting to add 'transaction_code' column...")
                await session.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_code VARCHAR;"))
                print("Added 'transaction_code' column.")

            # 3. Add Unique Index
            print("Adding unique index on 'transaction_code'...")
            await session.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_transactions_transaction_code ON transactions (transaction_code);"))
            
            await session.commit()
            print("Database schema updated successfully.")
            
        except Exception as e:
            print(f"Error updating schema: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(update_schema())
