import datetime
import re
from decimal import Decimal, InvalidOperation

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
    finishing_code: str | None = None
    finishing_label: str | None = None
    is_auction: bool = False
    auction_url: str | None = None
    term_of_application: str | None = None
    deadline_days: int | None = None
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
    author: str
    is_mine: bool


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class TokenOut(BaseModel):
    token: str
    username: str


class Me(BaseModel):
    id: int
    username: str


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
    auction: int


class PivotPoint(BaseModel):
    key: str
    value: float | None = None


class ScatterPoint(BaseModel):
    new_apart_id: int
    address: str | None = None
    district: str
    rooms: str
    area: float
    price: float
    price_m: float | None = None


class SankeyRow(BaseModel):
    district: str
    rooms: str
    bucket: str
    count: int


class BreakdownRow(BaseModel):
    key: str
    count: int
    reserved: int
    discounted: int
    family: int
    auction: int
    avg_price: float | None = None
    avg_price_m: float | None = None


class DeadlinePoint(BaseModel):
    date: datetime.date
    days_left: int
    count: int


class RatesInfo(BaseModel):
    key_rate: float
    key_rate_date: datetime.date | None = None
    market_rate: float  # оценка: ключевая + MARKET_RATE_DELTA
    family_rate: float


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


# --- torgi.mos.ru (транспорт) ------------------------------------------------


def _digits(value) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    digits = re.sub(r"\D", "", str(value))
    return int(digits) if digits else None


def _money(value) -> Decimal | None:
    """«612 000,00 руб.» / 612000.0 -> Decimal. Разряды пробелами, дробь запятой."""
    if value is None:
        return None
    if isinstance(value, (int, float, Decimal)):
        return Decimal(str(value))
    text = str(value).replace("\xa0", " ")
    match = re.search(r"-?\d[\d ]*(?:,\d+)?", text)
    if not match:
        return None
    try:
        return Decimal(match.group(0).replace(" ", "").replace(",", "."))
    except InvalidOperation:
        return None


def naive_utc(value) -> datetime.datetime | None:
    """Даты портала приходят как 2026-09-23T17:00:00.0000000Z — 7 знаков в
    дробной части, fromisoformat такое не ест, а колонки в БД наивные."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime.datetime):
        parsed = value
    else:
        text = str(value).strip().replace("Z", "+00:00")
        text = re.sub(r"\.(\d{6})\d+", r".\1", text)
        try:
            parsed = datetime.datetime.fromisoformat(text)
        except ValueError:
            return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return parsed


class TorgiLotSchema(BaseModel):
    """Строка для вставки в torgi_lots: собирается из списочного эндпоинта
    портала и карточки лота (см. src/torgi.py)."""

    model_config = ConfigDict(extra="ignore", coerce_numbers_to_str=True)

    lot_id: int
    name: str | None = None
    url: str | None = None
    status_text: str | None = None
    transport_category: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    plate: str | None = None
    # разбор номера считает src/plates.py при загрузке, а не выражение в SQL:
    # история версий хранит ровно то, что видел портал в тот прогон
    plate_norm: str | None = None
    plate_region: str | None = None
    plate_valid: bool = False
    vin: str | None = None
    pts: str | None = None
    color: str | None = None
    body: str | None = None
    eco_class: str | None = None
    power: str | None = None
    engine_volume: str | None = None
    drive: str | None = None
    transmission: str | None = None
    mileage: int | None = None
    start_price: Decimal | None = None
    deposit: Decimal | None = None
    auction_step: Decimal | None = None
    final_price: Decimal | None = None
    request_start_date: datetime.datetime | None = None
    request_end_date: datetime.datetime | None = None
    tender_date: datetime.datetime | None = None
    final_date: datetime.datetime | None = None
    platform_link: str | None = None
    torgi_gov_link: str | None = None
    video_link: str | None = None
    latitude: str | None = None
    longitude: str | None = None
    photos: list[str] | None = None
    portal_views: int | None = None
    source_updated_at: datetime.datetime | None = None

    @field_validator("year", "mileage", "portal_views", mode="before")
    @classmethod
    def _parse_int(cls, value):
        return _digits(value)

    @field_validator(
        "start_price", "deposit", "auction_step", "final_price", mode="before"
    )
    @classmethod
    def _parse_money(cls, value):
        return _money(value)

    @field_validator(
        "request_start_date",
        "request_end_date",
        "tender_date",
        "final_date",
        "source_updated_at",
        mode="before",
    )
    @classmethod
    def _parse_dt(cls, value):
        return naive_utc(value)

    @field_validator(
        "name", "brand", "model", "plate", "plate_norm", "plate_region",
        "vin", "pts", "color", "body",
        "eco_class", "power", "engine_volume", "drive", "transmission",
        "transport_category", "status_text", mode="before",
    )
    @classmethod
    def _blank_to_none(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class TorgiLotRow(BaseModel):
    """Ответ /torgi/lots — поля считает src/sql/torgi_lots.sql."""

    lot_id: int
    name: str | None = None
    status_text: str | None = None
    is_open: bool = False
    transport_category: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    plate: str | None = None
    plate_norm: str | None = None
    plate_region: str | None = None
    plate_valid: bool = False
    vin: str | None = None
    pts: str | None = None
    color: str | None = None
    body: str | None = None
    eco_class: str | None = None
    power: str | None = None
    engine_volume: str | None = None
    drive: str | None = None
    transmission: str | None = None
    mileage: int | None = None
    start_price: float | None = None
    deposit: float | None = None
    auction_step: float | None = None
    final_price: float | None = None
    start_price_prev: float | None = None
    start_price_delta_pct: float | None = None
    final_price_delta_pct: float | None = None
    request_start_date: datetime.datetime | None = None
    request_end_date: datetime.datetime | None = None
    tender_date: datetime.datetime | None = None
    final_date: datetime.datetime | None = None
    days_left: int | None = None
    platform_link: str | None = None
    torgi_gov_link: str | None = None
    video_link: str | None = None
    latitude: str | None = None
    longitude: str | None = None
    photos: list[str] = []
    photos_count: int = 0
    portal_views: int | None = None
    torgi_url: str
    is_favorite: bool = False
    matched_masks: list[str] = []  # маски/лейблы паттернов, под которые подошёл номер
    is_new: bool = False
    version: int
    updated_at: datetime.datetime


class TorgiLotVersion(BaseModel):
    """Строка истории версий лота — /torgi/lots/{lot_id}/versions.
    Числа отдаём числами: на фронте по ним строится график начальной цены."""

    lot_id: int
    version: int
    updated_at: datetime.datetime
    name: str | None = None
    status_text: str | None = None
    start_price: float | None = None
    final_price: float | None = None
    deposit: float | None = None
    auction_step: float | None = None
    mileage: int | None = None
    plate: str | None = None
    plate_norm: str | None = None
    plate_region: str | None = None
    plate_valid: bool = False
    request_end_date: datetime.datetime | None = None
    tender_date: datetime.datetime | None = None


class TorgiCategoryStat(BaseModel):
    category: str
    lots: int
    open_lots: int
    sold_lots: int
    avg_start_price: float | None = None
    min_start_price: float | None = None
    avg_final_price: float | None = None
    avg_mileage: float | None = None
    with_plate: int


class TorgiFavoriteToggleResult(BaseModel):
    lot_id: int
    is_favorite: bool


class PlateWatchIn(BaseModel):
    """Либо маска языка масок, либо label готового пресета из PRESETS."""

    mask: str | None = Field(default=None, max_length=12)
    preset: str | None = Field(default=None, max_length=64)
    label: str | None = Field(default=None, max_length=64)


class PlateWatch(BaseModel):
    id: int
    mask: str | None = None  # NULL у пресета
    label: str | None = None
    regex: str
    matched_now: int
    created_at: datetime.datetime


class PlatePreset(BaseModel):
    preset: str
    label: str


class TorgiNotification(BaseModel):
    kind: str  # plate_match | lot_change
    lot_id: int
    name: str | None = None
    plate_norm: str | None = None
    matched_masks: list[str] = []
    version: int
    updated_at: datetime.datetime
    status_text: str | None = None
    start_price: float | None = None
    prev_start_price: float | None = None
    final_price: float | None = None
    price_down: bool = False
    price_up: bool = False
    status_changed: bool = False
    sold: bool = False


class TorgiKpi(BaseModel):
    lots: int
    open_lots: int
    sold_lots: int
    avg_start_price: float | None = None
    sum_start_price: float | None = None
    sum_final_price: float | None = None
    median_final_delta_pct: float | None = None
    with_plate: int
    interesting_plates: int
    watch_matches: int
    avg_days_request_to_tender: float | None = None
    photos_coverage_pct: float | None = None
    changed_24h: int


class TorgiBrandStat(BaseModel):
    brand: str
    lots: int
    avg_start_price: float | None = None
    avg_delta_pct: float | None = None


class TorgiFunnelStage(BaseModel):
    status: str
    lots: int


class TorgiTimePoint(BaseModel):
    month: datetime.date
    lots: int
    sum_final_price: float | None = None
    avg_delta_pct: float | None = None


class TorgiSeasonPoint(BaseModel):
    month_of_year: int  # 1..12
    lots: int


class TorgiDeadlineRow(BaseModel):
    lot_id: int
    name: str | None = None
    status_text: str | None = None
    request_end_date: datetime.datetime
    days_left: int
    start_price: float | None = None


class TorgiChange(BaseModel):
    lot_id: int
    name: str | None = None
    version: int
    updated_at: datetime.datetime
    status_text: str | None = None
    prev_status_text: str | None = None
    start_price: float | None = None
    prev_start_price: float | None = None
    final_price: float | None = None
    delta_pct: float | None = None
    price_down: bool = False
    price_up: bool = False
    status_changed: bool = False
    sold: bool = False


class TorgiHistBin(BaseModel):
    bucket: str
    lots: int


class TorgiTopLot(BaseModel):
    lot_id: int
    name: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    start_price: float | None = None
    prev_start_price: float | None = None
    final_price: float | None = None
    delta_pct: float | None = None
    portal_views: int | None = None


class TorgiDataQuality(BaseModel):
    """Заполненность полей процентами 0–100 (не долями)."""

    lots: int
    plate: float | None = None
    vin: float | None = None
    pts: float | None = None
    photos: float | None = None
    video: float | None = None
    coords: float | None = None


class TorgiPlateFlavor(BaseModel):
    preset: str
    lots: int


class TorgiVersionBin(BaseModel):
    bucket: str  # число версий лота
    lots: int


class TorgiVersionDay(BaseModel):
    day: datetime.date
    changes: int


class TorgiVersionActivity(BaseModel):
    versions: list[TorgiVersionBin] = []
    changes_by_day: list[TorgiVersionDay] = []


class TorgiDashboard(BaseModel):
    last_refresh: datetime.datetime | None = None
    kpi: TorgiKpi
    categories: list[TorgiCategoryStat] = []
    brands: list[TorgiBrandStat] = []
    funnel: list[TorgiFunnelStage] = []
    timeseries: list[TorgiTimePoint] = []
    seasonality: list[TorgiSeasonPoint] = []
    deadlines: list[TorgiDeadlineRow] = []
    changes: list[TorgiChange] = []
    discount_hist: list[TorgiHistBin] = []
    year_hist: list[TorgiHistBin] = []
    mileage_hist: list[TorgiHistBin] = []
    top_drop: list[TorgiTopLot] = []
    top_premium: list[TorgiTopLot] = []
    top_views: list[TorgiTopLot] = []
    data_quality: TorgiDataQuality
    plate_flavors: list[TorgiPlateFlavor] = []
    version_activity: TorgiVersionActivity


class TorgiPivotRow(BaseModel):
    key: str
    lots: int
    open_lots: int
    sold_lots: int
    avg_start: float | None = None
    median_start: float | None = None
    avg_final: float | None = None
    avg_delta_pct: float | None = None
    avg_mileage: float | None = None
    avg_power: float | None = None
    rub_per_hp: float | None = None


class TorgiPoint(BaseModel):
    lot_id: int
    name: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    category: str
    status_text: str | None = None
    is_open: bool = False
    mileage: int | None = None
    power_hp: float | None = None
    engine_volume: float | None = None
    start_price: float | None = None
    final_price: float | None = None
    delta_pct: float | None = None
    portal_views: int | None = None
    plate_norm: str | None = None
    plate_region: str | None = None
    latitude: float | None = None
    longitude: float | None = None
