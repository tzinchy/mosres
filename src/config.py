from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict
import pathlib


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", frozen=True
    )
    DB: PostgresDsn = PostgresDsn(
        "postgresql+asyncpg://postgres:password@localhost:5432"
    )


MAIN_FOLDER = pathlib.Path("src")
EXCEL_FOLDER = MAIN_FOLDER.joinpath("excel")
EXCEL_FOLDER.mkdir(parents=True, exist_ok=True)


settings = Settings()
