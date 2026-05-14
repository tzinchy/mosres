from pydantic import BaseModel, Field, AliasChoices, ConfigDict
import datetime

class Building(BaseModel):
    building_id: int = Field(validation_alias=AliasChoices('id', 'building_id', 'object_id'))
    address: str = Field(validate_alias=AliasChoices('name', 'address'))  #name
    code: str 
    district: int
    longitude: str #coords[0]
    latitude: str #coords[1]
    yandex_url: str #генерируется на основе двух полей выше + ставится флаг поинт
    status_code: str #status_code {FINISHED : "Введены в эксплуатацию", "Строится"}
    soon:list[str] 
    finishing_code: str #"finishing" : {"FULL" : "С отделкой", "NO" : "Без отделки", "STD": "Отделка по стандарту реновации"}"
    img: str
    metro: list[str] #список метро в отдельном поле 
    metro_car: list[str] | None 
    metro_walk: list[str] | None
    floors: list[str] 
    flats: str
    vvod: str
    unique: int
    anon_texts: list[str]
    family_hypotec: int
    gallery: list[str]
    county: int #это короче чет типо и district и municipal_district по всей видимости так еще и метро наверное через ту же таблицу


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
    term_of_application: datetime.date #but got str
    open_sale: int
    reserve: int
    y2_sell: int
    for_sell : int
    num_of_floor: str
    property: str
    advants: list[str]
    article: str
    price_with_discount: str
    percentage_discount: str
    facing: dict[str, str | None]
    auction: str
    block_name: str
    model_config = ConfigDict(coerce_numbers_to_str=True)


class District(BaseModel):


class Metro(BaseModel): 
