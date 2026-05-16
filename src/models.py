import sqlalchemy as sa
import sqlalchemy.orm as saorm
import sqlalchemy.dialects.postgresql as sapg
from src.database import Base
from src.mixins import NewApartMixing, BuildingMixing
class Building(Base, BuildingMixing):
    __tablename__ = "buildings"
    
    building_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)


class NewApart(Base, NewApartMixing):
    __tablename__ = "new_aparts"
    
    new_apart_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)

    
class MunicipalDistrict(Base):
    __tablename__ = "municipal_districts"
    
    municipal_district_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)
    name: saorm.Mapped[str]
    polygons: saorm.Mapped[dict[str, str]] = saorm.mapped_column(sapg.JSONB)


class District(Base):
    __tablename__ = "districts"
    
    district_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True, autoincrement=True)
    name: saorm.Mapped[str]
    full_name: saorm.Mapped[str]
    polygons: saorm.Mapped[str]


class Metro(Base):
    __tablename__ = "metros"
    
    metro_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)
    name: saorm.Mapped[str]
    color: saorm.Mapped[str]

class NewApartHistory(Base, NewApartMixing):
    __tablename__ = 'new_apart_history'
    new_apart_history_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True, autoincrement=True) 
    new_apart_id: saorm.Mapped[int]

class BuildingHistory(Base, BuildingMixing): 
    __tablename__ = 'building_history'
    building_history_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True, autoincrement=True) 
    building_id: saorm.Mapped[int]
