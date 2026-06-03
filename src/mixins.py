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
    address: saorm.Mapped[str | None]
    building: saorm.Mapped[str | None]
    building_id: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    building_code: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    number: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True) 
    rooms: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    floor: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    block: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True) 
    area: saorm.Mapped[str | None]= saorm.mapped_column(nullable=True)
    price: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True) 
    price_m: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    type: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True) 
    term_of_application: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    open_sale: saorm.Mapped[int | None] = saorm.mapped_column(nullable=True)
    reserve: saorm.Mapped[int] = saorm.mapped_column(nullable=True) 
    y2_sell: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    for_sell: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    num_on_floor: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    property: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    advants: saorm.Mapped[list[str] | None] = saorm.mapped_column(sapg.ARRAY(sa.String), nullable=True)
    article: saorm.Mapped[str | None] =  saorm.mapped_column(nullable=True)
    price_with_discount: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    percentage_discount: saorm.Mapped[str | None] =  saorm.mapped_column(nullable=True)
    auction: saorm.Mapped[str | None] = saorm.mapped_column(default=None, nullable=True)
    block_name: saorm.Mapped[str] = saorm.mapped_column(default=None, nullable=True)
