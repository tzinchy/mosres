import sqlalchemy as sa
import sqlalchemy.orm as saorm
import sqlalchemy.dialects.postgresql as sapg


class BuildingMixing:
    address: saorm.Mapped[str] = saorm.mapped_column(nullable=True)
    code: saorm.Mapped[str]
    district: saorm.Mapped[int]
    latitude: saorm.Mapped[str | None]
    longitude: saorm.Mapped[str | None]
    status_code: saorm.Mapped[str]
    finishing_code: saorm.Mapped[
        str | None
    ]  # "finishing" : {"FULL" : "С отделкой", "NO" : "Без отделки", "STD": "Отделка по стандарту реновации"}
    metro: saorm.Mapped[list[str] | None] = saorm.mapped_column(
        sapg.ARRAY(sa.String), default=None
    )
    metro_car: saorm.Mapped[list[str] | None] = saorm.mapped_column(
        sapg.ARRAY(sa.String), default=None
    )
    metro_walk: saorm.Mapped[list[str] | None] = saorm.mapped_column(
        sapg.ARRAY(sa.String), default=None
    )
    floors: saorm.Mapped[str | None]
    flats: saorm.Mapped[str | None] = None  # исправлено: было saorm[str | None]
    vvod: saorm.Mapped[str | None]
    anons_texts: saorm.Mapped[list[str] | None] = saorm.mapped_column(
        sapg.ARRAY(sa.String), default=None
    )
    family_hypotec: saorm.Mapped[int]
    county: saorm.Mapped[
        int
    ]  # это типа и district и municipal_district, и метро через ту же таблицу


class NewApartMixing:
    address: saorm.Mapped[str]
    building: saorm.Mapped[str]
    building_id: saorm.Mapped[str]
    building_code: saorm.Mapped[str]
    number: saorm.Mapped[str]
    rooms: saorm.Mapped[str]
    floor: saorm.Mapped[str]
    block: saorm.Mapped[str]
    area: saorm.Mapped[str]
    price: saorm.Mapped[str]
    price_m: saorm.Mapped[str]
    type: saorm.Mapped[str]
    term_of_application: saorm.Mapped[str]
    open_sale: saorm.Mapped[int]
    reserve: saorm.Mapped[int]
    y2_sell: saorm.Mapped[str]
    for_sell: saorm.Mapped[str]
    num_on_floor: saorm.Mapped[str]
    property: saorm.Mapped[str]
    advants: saorm.Mapped[list[str]] = saorm.mapped_column(sapg.ARRAY(sa.String))
    article: saorm.Mapped[str]
    price_with_discount: saorm.Mapped[str]
    percentage_discount: saorm.Mapped[str]
    auction: saorm.Mapped[str | None] = saorm.mapped_column(default=None)
    block_name: saorm.Mapped[str]
