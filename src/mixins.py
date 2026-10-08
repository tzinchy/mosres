import datetime
from decimal import Decimal

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
    img: saorm.Mapped[str | None] = saorm.mapped_column(default=None, nullable=True)
    gallery: saorm.Mapped[list[str] | None] = saorm.mapped_column(
        sapg.ARRAY(sa.String), default=None, nullable=True
    )


class NewApartMixing:
    address: saorm.Mapped[str | None]
    building: saorm.Mapped[str | None]
    building_id: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    building_code: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    number: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    rooms: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    floor: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    block: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    area: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
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
    advants: saorm.Mapped[list[str] | None] = saorm.mapped_column(
        sapg.ARRAY(sa.String), nullable=True
    )
    article: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    price_with_discount: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    percentage_discount: saorm.Mapped[str | None] = saorm.mapped_column(nullable=True)
    auction: saorm.Mapped[str | None] = saorm.mapped_column(default=None, nullable=True)
    block_name: saorm.Mapped[str] = saorm.mapped_column(default=None, nullable=True)
    plan: saorm.Mapped[str | None] = saorm.mapped_column(default=None, nullable=True)
    plan_s: saorm.Mapped[str | None] = saorm.mapped_column(default=None, nullable=True)
    tour_3d: saorm.Mapped[str | None] = saorm.mapped_column(default=None, nullable=True)


class TorgiLotMixing:
    """Лот с torgi.mos.ru (раздел «Транспортные средства»).

    Часть полей приходит из списочного эндпоинта, часть — только из карточки
    лота (госномер, VIN, статус, задаток, итоговая цена), поэтому обновление
    всегда ходит в оба эндпоинта.
    """

    name: saorm.Mapped[str | None]
    url: saorm.Mapped[str | None]
    status_text: saorm.Mapped[str | None]
    transport_category: saorm.Mapped[str | None]
    brand: saorm.Mapped[str | None]
    model: saorm.Mapped[str | None]
    year: saorm.Mapped[int | None]
    plate: saorm.Mapped[str | None]
    # разобранный номер (см. src/plates.py): считается при загрузке лота, чтобы
    # история хранила ровно то, что видел портал в тот прогон
    plate_norm: saorm.Mapped[str | None]
    plate_region: saorm.Mapped[str | None]
    plate_valid: saorm.Mapped[bool] = saorm.mapped_column(
        nullable=False, server_default=sa.false()
    )
    vin: saorm.Mapped[str | None]
    pts: saorm.Mapped[str | None]
    color: saorm.Mapped[str | None]
    body: saorm.Mapped[str | None]
    eco_class: saorm.Mapped[str | None]
    power: saorm.Mapped[str | None]
    engine_volume: saorm.Mapped[str | None]
    drive: saorm.Mapped[str | None]
    transmission: saorm.Mapped[str | None]
    mileage: saorm.Mapped[int | None]
    start_price: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    deposit: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    auction_step: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    final_price: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    request_start_date: saorm.Mapped[datetime.datetime | None]
    request_end_date: saorm.Mapped[datetime.datetime | None]
    tender_date: saorm.Mapped[datetime.datetime | None]
    final_date: saorm.Mapped[datetime.datetime | None]
    platform_link: saorm.Mapped[str | None]
    torgi_gov_link: saorm.Mapped[str | None]
    video_link: saorm.Mapped[str | None]
    latitude: saorm.Mapped[str | None]
    longitude: saorm.Mapped[str | None]
    photos: saorm.Mapped[list[str] | None] = saorm.mapped_column(
        sapg.ARRAY(sa.String), default=None
    )
    # портал крутит счётчик просмотров на каждом обновлении — в сравнении
    # версий не участвует, иначе история пухнет на каждый прогон
    portal_views: saorm.Mapped[int | None]
    source_updated_at: saorm.Mapped[datetime.datetime | None]


class TorgiObjectMixing:
    """Лот torgi.mos.ru из разделов недвижимости и имущества: квартиры, комнаты,
    машино-места, нежилые помещения, здания, земельные участки, территории,
    акции/доли.

    Транспорт живёт отдельно (`torgi_lots`) — у него своя карточка с госномером
    и VIN и свой разбор номеров.

    Списочный эндпоинт портала отдаёт почти всё: адрес, площади, этаж, цену,
    округ, район, метро и координаты. Только из карточки приходят статус,
    кадастровый номер, год постройки, задаток, шаг аукциона и итоговая цена,
    поэтому карточки читаются не для всех лотов (см. src/torgi_objects.py).
    Разнородные поля карточки (их набор свой у каждого типа объекта) целиком
    складываются в `details`, чтобы новый ярлык портала не требовал миграции.
    """

    object_type_code: saorm.Mapped[str | None]
    object_type_name: saorm.Mapped[str | None]
    # nsi:tender_type_portal:* — продажа, аренда и прочие формы сделки
    tender_type_code: saorm.Mapped[str | None]
    name: saorm.Mapped[str | None]
    url: saorm.Mapped[str | None]
    address: saorm.Mapped[str | None]
    short_address: saorm.Mapped[str | None]
    object_address: saorm.Mapped[str | None]
    region_name: saorm.Mapped[str | None]
    district_name: saorm.Mapped[str | None]
    unom: saorm.Mapped[int | None]
    object_area: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    living_area: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    kitchen_area: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    rooms_count: saorm.Mapped[int | None]
    room_floor: saorm.Mapped[int | None]
    floors: saorm.Mapped[int | None]
    start_price: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    price_per_square: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    request_start_date: saorm.Mapped[datetime.datetime | None]
    request_end_date: saorm.Mapped[datetime.datetime | None]
    tender_date: saorm.Mapped[datetime.datetime | None]
    final_date: saorm.Mapped[datetime.datetime | None]
    platform_link: saorm.Mapped[str | None]
    torgi_gov_link: saorm.Mapped[str | None]
    latitude: saorm.Mapped[str | None]
    longitude: saorm.Mapped[str | None]
    photos: saorm.Mapped[list[str] | None] = saorm.mapped_column(
        sapg.ARRAY(sa.String), default=None
    )
    # [{"name": "Верхние Лихоборы", "walk": 9, "transport": 9}, …]
    metro: saorm.Mapped[list[dict] | None] = saorm.mapped_column(
        sapg.JSONB, default=None
    )
    # --- только из карточки лота ---
    status_text: saorm.Mapped[str | None]
    cadastral_number: saorm.Mapped[str | None]
    build_year: saorm.Mapped[int | None]
    house_type: saorm.Mapped[str | None]
    purpose: saorm.Mapped[str | None]
    deposit: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    auction_step: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    final_price: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    # весь objectInfo карточки как есть: {"Тип дома": "Крупнопанельные", …}
    details: saorm.Mapped[dict | None] = saorm.mapped_column(sapg.JSONB, default=None)
    # портал крутит счётчик просмотров на каждом обновлении — в сравнении
    # версий не участвует, иначе история пухнет на каждый прогон
    portal_views: saorm.Mapped[int | None]
    source_updated_at: saorm.Mapped[datetime.datetime | None]
    # когда последний раз читали карточку: архив карточками не перечитывается
    detail_fetched_at: saorm.Mapped[datetime.datetime | None]
