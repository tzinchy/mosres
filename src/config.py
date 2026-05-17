from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", frozen=True
    )
    DB: PostgresDsn = PostgresDsn(
        "postgresql+asyncpg://postgres:password@localhost:5432"
    )


settings = Settings()
