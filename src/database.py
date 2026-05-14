from datetime import datetime, timezone

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedColumn

from src.config import settings

CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    __table_args__ = {
        'schema' : 'mosquarter'
    }
    created_at: Mapped[datetime] = MappedColumn(default=datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = MappedColumn(default=datetime.now(timezone.utc))
    metadata = MetaData(naming_convention=CONVENTION)


engine = create_async_engine(
    str(settings.DB),
    pool_size=5,
    max_overflow=0,
    echo=False,
)

Session = async_sessionmaker(engine, expire_on_commit=False)