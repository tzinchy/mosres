import datetime

from pydantic import AliasChoices, AliasPath, BaseModel, ConfigDict, Field, TypeAdapter, field_validator


class MetroStop(BaseModel):
    name: str | None = None
    color: str | None = None
    car: str | None = None
    walk: str | None = None


class ApartRow(BaseModel):
    new_apart_id: int
    address: str | None = None
    building: str | None = None
    building_id: str | None = None
    number: str | None = None
    rooms: str | None = None
    floor: str | None = None
    area: str | None = None
    reserve: int | None = None
    property: str | None = None
    is_family: bool = False
    price: float | None = None
    price_m: float | None = None
    price_discounted: float | None = None
    price_prev: float | None = None
    price_delta_prev: float | None = None
    price_delta_prev_pct: float | None = None
    price_max: float | None = None
    price_delta_max_pct: float | None = None
    has_discount: bool = False
    discount_is_new: bool = False
    discount_pct: float | None = None
    is_favorite: bool = False
    has_comment: bool = False
    type_label: str | None = None
    plan_url: str | None = None
    tour_3d_url: str | None = None
    metro: list[MetroStop] = []
    family_hypotec: int | None = None
    deal_score: float | None = None
    mosres_url: str
    updated_at: datetime.datetime


class FavoriteToggleResult(BaseModel):
    new_apart_id: int
    is_favorite: bool


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class Comment(BaseModel):
    id: int
    new_apart_id: int
    body: str
    created_at: datetime.datetime


class DashboardMetrics(BaseModel):
    aparts_total: int
    favorites_total: int
    buildings_total: int
    reserved_total: int
    discount_total: int
    family_total: int
    portfolio_value: float | None = None
    avg_price: float | None = None
    avg_price_m: float | None = None
    new_today: int
    changed_today: int
    price_drops_today: int
    price_rises_today: int
    avg_price_change_pct_today: float | None = None
    discounts_appeared_today: int
    reserved_today: int
    unreserved_today: int
    favorites_reserved: int
    favorites_reserved_today: int


class DashboardPoint(BaseModel):
    day: datetime.date
    total: int
    reserved: int
    discounted: int
    family: int


class DashboardChange(BaseModel):
    new_apart_id: int
    address: str | None = None
    number: str | None = None
    # price_drop | price_rise | discount_new | discount_gone
    # | reserved | unreserved | family_on | family_off
    kind: str
    prev_price: float | None = None
    next_price: float | None = None
    pct: float | None = None


class Notification(BaseModel):
    new_apart_id: int
    version: int
    updated_at: datetime.datetime
    address: str | None = None
    building: str | None = None
    number: str | None = None
    price: float | None = None
    prev_price: float | None = None
    price_down: bool
    price_up: bool
    discount_new: bool
    discount_gone: bool
    reserved: bool
    unreserved: bool


class PriceHistoryPoint(BaseModel):
    district: str
    day: datetime.date
    avg_price_m: float | None = None
    min_price_m: float | None = None
    aparts: int


class MetroStat(BaseModel):
    metro_id: int
    name: str | None = None
    color: str | None = None
    aparts: int
    favorites: int
    with_discount: int
    reserved: int
    avg_price_m: float | None = None


class BuildingStat(BaseModel):
    building_id: int
    address: str | None = None
    status_label: str | None = None
    img_url: str | None = None
    aparts: int
    avg_price: float | None = None
    min_price: float | None = None
    avg_price_m: float | None = None
    reserved: int
    with_discount: int
    family: int
    new_week: int
    favorites_count: int = 0


class RefreshStatus(BaseModel):
    last_refresh: datetime.datetime | None = None
    interval_minutes: int
    history_from: datetime.date | None = None
    history_to: datetime.date | None = None


class BuildingRow(BaseModel):
    building_id: int
    address: str | None = None
    code: str | None = None
    status_code: str | None = None
    status_label: str | None = None
    finishing_code: str | None = None
    finishing_label: str | None = None
    floors: str | None = None
    flats: str | None = None
    vvod: str | None = None
    family_hypotec: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    anons_texts: list[str] | None = None
    img_url: str | None = None
    gallery_urls: list[str] = []
    metro: list[MetroStop] = []
    favorites_count: int = 0


class BuildingPricePoint(BaseModel):
    snapshot_date: datetime.date
    avg_price_m: float | None = None
    min_price_m: float | None = None
    median_price_m: float | None = None
    apart_count: int


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
    img: str | None = None
    gallery: list[str] | None = None
    model_config = ConfigDict(
        extra="ignore", coerce_numbers_to_str=True, populate_by_name=True
    )
    @field_validator('family_hypotec', mode='before')
    @classmethod
    def check_age(cls, value):
        if isinstance(value, int):
            return value
        return 0


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
    advants: list[str] | None = None
    block_name: str | None = None
    plan: str | None = None
    plan_s: str | None = None
    tour_3d: str | None = Field(default=None, validation_alias=AliasChoices("3d", "tour_3d"))
    model_config = ConfigDict(coerce_numbers_to_str=True, extra="ignore")


class MunicipalDistrictSchemaBase(BaseModel):
    name: str
    polygons: str


class MunicipalDistrictSchemaForInsert(MunicipalDistrictSchemaBase):
    municipal_district_id: int
    model_config = ConfigDict(extra="ignore")


class DistrictSchemaBase(BaseModel):
    name: str
    full_name: str
    polygons: str

    model_config = ConfigDict(extra="ignore")


class DistrictSchemaForInsert(DistrictSchemaBase):
    district_id: int
    model_config = ConfigDict(extra="ignore")


class DistrictSchemaForTypeAdapter(DistrictSchemaBase):
    municipal_district: dict[str, MunicipalDistrictSchemaBase] = Field(
        validation_alias=AliasChoices("district", "districts")
    )
    model_config = ConfigDict(extra="ignore")


class MetroSchemaBase(BaseModel):
    name: str
    color: str
    model_config = ConfigDict(extra="ignore")


class MetroSchemaForInsert(MetroSchemaBase):
    metro_id: int
    model_config = ConfigDict(extra="ignore")


DistrictAdapter = TypeAdapter(dict[str, DistrictSchemaForTypeAdapter])
MetroAdapter = TypeAdapter(dict[str, MetroSchemaBase])
