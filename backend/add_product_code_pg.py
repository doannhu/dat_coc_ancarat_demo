from sqlalchemy import create_engine, text
import os

# Database connection parameters
DATABASE_URL = "postgresql://user:password@database_db:5432/dbname"

def upgrade_db():
    try:
        print("Connecting to database...")
        engine = create_engine(DATABASE_URL)
        connection = engine.connect()
        
        # Check if column exists
        result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='product_code';"))
        exists = result.fetchone()
        
        if not exists:
            print("Adding product_code column to products table...")
            connection.execute(text("ALTER TABLE products ADD COLUMN product_code VARCHAR(255) UNIQUE;"))
            connection.commit()
            print("Column added successfully.")
        else:
            print("Column product_code already exists.")
            
        connection.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    upgrade_db()
