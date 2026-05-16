import sqlalchemy.orm as saorm
import sqlalchemy as sa
from database import Base

class Building(Base):
    building_id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True)
    address: saorm.Mapped[str] 
    code: saorm.Mapped[str] 
    district: int
    latitude: saorm.Mapped[str | None] 
    longitude: saorm.Mapped[str | None] 
    status_code: saorm.Mapped[str]
    soon: saorm.Mapped[list[str] | None]
    finishing_code: saorm.Mapped[str | None] #"finishing" : {"FULL" : "С отделкой", "NO" : "Без отделки", "STD": "Отделка по стандарту реновации"}"
    img: saorm.Mapped[str | None]
    metro: saorm.Mapped[list[str] | None]
    metro_car: saorm.Mapped[list[str] | None]
    metro_walk: saorm.Mapped[list[str] | None]
    floors: saorm.Mapped[str | None]
    flats: saorm[str | None]
    vvod: saorm.Mapped[str | None]
    unique: saorm.Mapped[int | None]
    anons_texts: list[str] | None = None
    family_hypotec: int
    gallery: list[str]
    county: int #это короче чет типо и district и municipal_district по всей видимости так еще и метро наверное через ту же таблицу
    model_config = ConfigDict(extra='allow', coerce_numbers_to_str=True, populate_by_name=True)
class NewApart(Base):
    new_apart_id: int  = Field(validation_alias=AliasChoices('id','new_apart_id'))
    address: str  = Field(validation_alias=AliasChoices('name', 'address'))#name
    building: str = Field(validation_alias=AliasChoices('object', 'building'))#object
    building_id: str = Field(validation_alias=AliasChoices('object_id', 'building_id'))#object_id
    building_code: str = Field(validation_alias=AliasChoices('object_code', 'building_code')) #object_code
    number: str #number 
    rooms: str
    floor: str
    block: str
    area: float #but got str
    price: float #but got str
    price_m: float #but got str
    plan_s: str
    plan: str
    type: str 
    term_of_application: str #but got str
    open_sale: int
    reserve: int
    y2_sell: int | str
    for_sell : int | str
    num_on_floor: str
    property: str
    advants: list[str]
    article: str
    price_with_discount: str
    percentage_discount: str
    facing: dict[str, str | None]
    auction: str | None = None
    block_name: str
    model_config = ConfigDict(coerce_numbers_to_str=True, extra='allow')

class MunicipalDistrict(Base):
    name: str
    polygons: dict[str, str] 
    
class District(Base):
    name: str
    full_name: str
    polygons: str
    municipal_district:dict[str, MunicipalDistrict] = Field(AliasChoices('district', 'districts'))

class Metro(Base): 
    name: str
    color: str
