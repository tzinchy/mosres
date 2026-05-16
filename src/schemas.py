from pydantic import BaseModel, Field, AliasChoices, ConfigDict, TypeAdapter, AliasPath
import datetime

class Building(BaseModel):
    building_id: int = Field(None, validation_alias=AliasChoices('id', 'building_id', 'object_id'))
    address: str = Field(None, validate_alias=AliasChoices('name', 'address'))  #name
    code: str 
    district: int
    latitude: str = Field(None, validate_alias=AliasPath('coords', 0))#coords[0]
    longitude: str = Field(None, validate_alias=AliasPath('coords', 1)) #coords[1]
    status_code: str #status_code {FINISHED : "Введены в эксплуатацию", "Строится"}
    soon:list[str] 
    finishing_code: str | None = None #"finishing" : {"FULL" : "С отделкой", "NO" : "Без отделки", "STD": "Отделка по стандарту реновации"}"
    img: str
    metro: list[str] | None = None
    metro_car: list[str] | None = None
    metro_walk: list[str] | None = None
    floors: str | None = None
    flats: str | None = None
    vvod: str | None = None
    unique: int | None = None
    anons_texts: list[str] | None = None
    family_hypotec: int
    gallery: list[str]
    county: int #это короче чет типо и district и municipal_district по всей видимости так еще и метро наверное через ту же таблицу
    model_config = ConfigDict(extra='allow', coerce_numbers_to_str=True, populate_by_name=True)
class NewApart(BaseModel):
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

class MunicipalDistrict(BaseModel):
    name: str
    polygons: dict[str, str] 
    
class District(BaseModel):
    name: str
    full_name: str
    polygons: str
    municipal_district:dict[str, MunicipalDistrict] = Field(AliasChoices('district', 'districts'))

class Metro(BaseModel): 
    name: str
    color: str

DistrictAdapter = TypeAdapter(dict[str, District])
MetroAdapter = TypeAdapter(dict[str, Metro])