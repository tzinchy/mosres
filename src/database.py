from datetime import datetime

from sqlalchemy import MetaData, String, func
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from src.config import settings

CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    metadata = MetaData(naming_convention=CONVENTION)
    notes: Mapped[str] = mapped_column(String, nullable=True)


engine = create_async_engine(
    str(settings.DB),
    pool_size=5,
    max_overflow=0,
    echo=False,
)

Session = async_sessionmaker(engine, expire_on_commit=False)
