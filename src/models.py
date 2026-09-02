import datetime
from decimal import Decimal

import sqlalchemy as sa
import sqlalchemy.orm as saorm
import sqlalchemy.dialects.postgresql as sapg
from src.database import Base
from src.mixins import NewApartMixing, BuildingMixing


class Building(Base, BuildingMixing):
    __tablename__ = "buildings"

    building_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)
    version: saorm.Mapped[int] = saorm.mapped_column(nullable=False, server_default="0")


class NewApart(Base, NewApartMixing):
    __tablename__ = "new_aparts"

    new_apart_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)
    version: saorm.Mapped[int] = saorm.mapped_column(nullable=False, server_default="0")


class MunicipalDistrict(Base):
    __tablename__ = "municipal_districts"

    municipal_district_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)
    name: saorm.Mapped[str]
    polygons: saorm.Mapped[dict[str, str]] = saorm.mapped_column(sapg.JSONB)


class District(Base):
    __tablename__ = "districts"

    district_id: saorm.Mapped[int] = saorm.mapped_column(
        primary_key=True, autoincrement=True
    )
    name: saorm.Mapped[str]
    full_name: saorm.Mapped[str]
    polygons: saorm.Mapped[str]


class Metro(Base):
    __tablename__ = "metros"

    metro_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)
    name: saorm.Mapped[str]
    color: saorm.Mapped[str]


class NewApartHistory(Base, NewApartMixing):
    __tablename__ = "new_aparts_history"
    new_apart_history_id: saorm.Mapped[int] = saorm.mapped_column(
        primary_key=True, autoincrement=True
    )
    new_apart_id: saorm.Mapped[int]
    version: saorm.Mapped[int] = saorm.mapped_column(nullable=False)


class BuildingHistory(Base, BuildingMixing):
    __tablename__ = "buildings_history"
    building_history_id: saorm.Mapped[int] = saorm.mapped_column(
        primary_key=True, autoincrement=True
    )
    building_id: saorm.Mapped[int]
    version: saorm.Mapped[int] = saorm.mapped_column(nullable=False)


class BuildingTemp(Base, BuildingMixing):
    __tablename__ = "buildings_temp"
    building_id: saorm.Mapped[int] = saorm.mapped_column(
        primary_key=True, autoincrement=True
    )


class NewApartTemp(Base, NewApartMixing):
    __tablename__ = "new_aparts_temp"
    new_apart_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)


class Favorite(Base):
    __tablename__ = "favorites"

    new_apart_id: saorm.Mapped[int] = saorm.mapped_column(
        sa.ForeignKey("new_aparts.new_apart_id", ondelete="CASCADE"), primary_key=True
    )


class RefreshRun(Base):
    __tablename__ = "refresh_runs"

    id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True, autoincrement=True)
    ran_at: saorm.Mapped[datetime.datetime] = saorm.mapped_column(
        server_default=sa.func.now(), nullable=False
    )
    ok: saorm.Mapped[bool] = saorm.mapped_column(server_default=sa.true(), nullable=False)


class BuildingPriceStat(Base):
    __tablename__ = "building_price_stats"
    __table_args__ = (sa.UniqueConstraint("building_id", "snapshot_date"),)

    id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True, autoincrement=True)
    building_id: saorm.Mapped[int] = saorm.mapped_column(nullable=False)
    snapshot_date: saorm.Mapped[datetime.date] = saorm.mapped_column(
        server_default=sa.func.now(), nullable=False
    )
    avg_price_m: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    min_price_m: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    median_price_m: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    apart_count: saorm.Mapped[int] = saorm.mapped_column(nullable=False)
