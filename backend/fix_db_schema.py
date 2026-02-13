import asyncio
from sqlalchemy import text
from app.db.session import async_session_maker

async def fix_schema():
    async with async_session_maker() as session:
        print("Fixing database schema...")
        try:
            # 1. Drop the unique index on transaction_code (if exists)
            print("Dropping index ix_transactions_transaction_code...")
            await session.execute(text("DROP INDEX IF EXISTS ix_transactions_transaction_code;"))

            # 2. Rename transaction_code back to code (if transaction_code exists)
            # Check if transaction_code exists first? Or just try rename.
            # Assuming current state is: transaction_code exists, code does not.
            print("Renaming transaction_code back to code...")
            try:
                await session.execute(text("ALTER TABLE transactions RENAME COLUMN transaction_code TO code;"))
                print("Renamed transaction_code => code.")
            except Exception as e:
                print(f"Rename failed (maybe column transaction_code doesn't exist or code already exists): {e}")

            # 3. Add transaction_code column (if not exists)
            print("Adding transaction_code column...")
            await session.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_code VARCHAR;"))

            # 4. Add Unique Index on transaction_code
            print("Adding unique index on transaction_code...")
            await session.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_transactions_transaction_code ON transactions (transaction_code);"))
            
            await session.commit()
            print("Database schema fixed successfully.")
            
        except Exception as e:
            print(f"Error fixing schema: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(fix_schema())
