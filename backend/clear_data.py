import os
from sqlalchemy import create_engine, text

# Default to localhost:5433 which is mapped in docker-compose.yml
# Inside docker container, you would use postgresql://user:password@db:5432/dbname
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/dbname")

def clear_data():
    try:
        print(f"Connecting to database at {DATABASE_URL}...")
        engine = create_engine(DATABASE_URL)
        
        # Use an explicit connection
        with engine.connect() as connection:
            # We need to start a transaction explicitly
            with connection.begin():
                print("Deleting records from transaction_items...")
                connection.execute(text("DELETE FROM transaction_items;"))
                
                print("Deleting records from transactions...")
                connection.execute(text("DELETE FROM transactions;"))
                
                print("Deleting records from products...")
                connection.execute(text("DELETE FROM products;"))
                
            print("Data cleared successfully. Commit completed.")
            
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL data in transactions, products, and transaction_items tables? (y/N): ")
    if confirm.lower() == 'y':
        clear_data()
    else:
        print("Aborted.")
