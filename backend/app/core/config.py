from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI Bac Hoa Tung Quan ly coc Ancarat"
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/dbname"

    class Config:
        case_sensitive = True

settings = Settings()
