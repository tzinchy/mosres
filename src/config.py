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
    SCHEDULER_ENABLED: bool = True
    REFRESH_INTERVAL_MINUTES: int = 30
    # рыночная ипотека ≈ ключевая ставка ЦБ + столько процентных пунктов
    MARKET_RATE_DELTA: float = 4.0
    # льготная (семейная) ипотека — фиксирована госпрограммой
    FAMILY_RATE: float = 6.0


MAIN_FOLDER = pathlib.Path("src")
EXCEL_FOLDER = MAIN_FOLDER.joinpath("excel")
EXCEL_FOLDER.mkdir(parents=True, exist_ok=True)


settings = Settings()
