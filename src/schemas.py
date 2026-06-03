from pydantic import AliasChoices, AliasPath, BaseModel, ConfigDict, Field, TypeAdapter, model_validator
import pandas as pd
from typing import Any

class BuildingSchema(BaseModel):
    building_id: int = Field(
        None, validation_alias=AliasChoices("id", "building_id", "object_id")
    )
    address: str | None = Field(default=None, validation_alias=AliasChoices("name"))
    code: str
    district: int
    latitude: str = Field(None, validation_alias=AliasPath("coords", 0))  # coords[0]
    longitude: str = Field(None, validation_alias=AliasPath("coords", 1))  # coords[1]
    status_code: str  # status_code {FINISHED : "Введены в эксплуатацию", "Строится"}
    finishing_code: str | None = (
        None  # "finishing" : {"FULL" : "С отделкой", "NO" : "Без отделки", "STD": "Отделка по стандарту реновации"}"
    )
    metro: list[str] | None = None
    metro_car: list[str] | None = None
    metro_walk: list[str] | None = None
    floors: str | None = None
    flats: str | None = None
    vvod: str | None = None
    anons_texts: list[str] | None = None
    family_hypotec: int
    county: int  # это короче чет типо и district и municipal_district по всей видимости так еще и метро наверное через ту же таблицу
    model_config = ConfigDict(
        extra="allow", coerce_numbers_to_str=True, populate_by_name=True
    )


class NewApartSchema(BaseModel):
    new_apart_id: int | None = Field(
        default=None, validation_alias=AliasChoices("id", "new_apart_id")
    )
    address: str | None = Field(default=None, validation_alias=AliasChoices("name"))
    building: str | None = Field(
        default=None, validation_alias=AliasChoices("object", "building")
    )
    building_id: str | None = Field(
        default=None, validation_alias=AliasChoices("object_id", "building_id")
    )
    building_code: str | None = Field(
        default=None, validation_alias=AliasChoices("object_code", "building_code")
    )
    number: str | None = None
    rooms: str | None = None
    floor: str | None = None
    block: str | None = None
    area: str | None = None
    price: str | None = None
    price_m: str | None = None
    type: str | None = None
    term_of_application: str | None = None
    open_sale: int | None = None
    reserve: int | None = None
    y2_sell: str | None = None
    for_sell: str | None = None
    num_on_floor: str | None = None
    property: str | None = None
    article: str | None = None
    price_with_discount: str | None = None
    percentage_discount: str | None = None
    auction: str | None = None
    block_name: str | None = None

    model_config = ConfigDict(coerce_numbers_to_str=True, extra="allow")


class MunicipalDistrictSchema(BaseModel):
    name: str
    polygons: dict[str, str]


class DistrictSchema(BaseModel):
    name: str
    full_name: str
    polygons: str
    municipal_district: dict[str, MunicipalDistrictSchema] = Field(
        AliasChoices("district", "districts")
    )


class MetroSchema(BaseModel):
    name: str
    color: str

class NewApartHistorySchema(BaseModel):
    model_config = {"coerce_numbers_to_str": True}  # автоматически int/float → str

    new_apart_id: int
    version: int
    address: str
    building: str
    building_id: str | None = None
    building_code: str | None = None
    number: str          # придёт 801 (int) → станет "801"
    rooms: str
    floor: str
    block: str | None = None
    area: str
    price: str
    price_m: str
    type: str
    term_of_application: str
    open_sale: int
    reserve: int
    y2_sell: str | None = None
    for_sell: str | None = None
    num_on_floor: str | None = None
    property: str | None = None
    article: str | None = None
    price_with_discount: str | None = None
    percentage_discount: str | None = None
    auction: str | None = None
    block_name: str | None = None
    created_at: Any = None
    updated_at: Any = None

    @model_validator(mode="before")
    @classmethod
    def replace_nan(cls, values: dict) -> dict:
        """Заменяем все NaN/nan-строки на None до валидации."""
        return {
            k: (None if (isinstance(v, float) and pd.isna(v)) or v in ("NaN", "nan") else v)
            for k, v in values.items()
        }

DistrictAdapter = TypeAdapter(dict[str, DistrictSchema])
MetroAdapter = TypeAdapter(dict[str, MetroSchema])
