import datetime
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from src.rates import get_key_rate
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from src.auth import (
    current_user_id,
    hash_password,
    make_token,
    parse_token,
    set_current_user_id,
    verify_password,
)
from src.config import settings
from src.depends import (
    get_mosres_service,
    get_torgi_objects_service,
    get_torgi_service,
    MosResService,
)
from src.torgi import TorgiService
from src.torgi_objects import TorgiObjectsService
from src.scheduler import build_scheduler
from src.schemas import (
    ApartRow,
    BuildingPricePoint,
    BuildingRow,
    BuildingStat,
    Comment,
    CommentIn,
    LoginIn,
    Me,
    RegisterIn,
    TokenOut,
    DashboardChange,
    DashboardMetrics,
    DashboardPoint,
    PivotPoint,
    ScatterPoint,
    SankeyRow,
    BreakdownRow,
    DeadlinePoint,
    RatesInfo,
    FavoriteToggleResult,
    MetroStat,
    Notification,
    PriceHistoryPoint,
    RefreshStatus,
    PlatePreset,
    PlateWatch,
    PlateWatchIn,
    TorgiCategoryStat,
    TorgiDashboard,
    TorgiFavoriteToggleResult,
    TorgiLotRow,
    TorgiLotVersion,
    TorgiObjectBreakdownRow,
    TorgiObjectFavoriteToggleResult,
    TorgiObjectRow,
    TorgiObjectStat,
    TorgiObjectVersion,
    TorgiNotification,
    TorgiPivotRow,
    TorgiPoint,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    scheduler = None
    if settings.SCHEDULER_ENABLED:
        scheduler = build_scheduler()
        scheduler.start()
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="mosres-api",
    version="0.1.0",
    description="Удобное api для получения информации с https://xn--80aae5aibotfo5h.xn--p1ai/. По умолчанию собирает данные по жилой недвижомсти. Раздел /torgi — транспортные лоты с torgi.mos.ru",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


# Открытые пути: всё остальное требует заголовок Authorization: Bearer <token>.
PUBLIC_PATHS = {
    "/",
    "/auth/login",
    "/auth/register",
    "/docs",
    "/redoc",
    "/openapi.json",
}


@app.middleware("http")
async def require_auth(request: Request, call_next):
    if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
        return await call_next(request)

    user_id = parse_token(request.headers.get("Authorization"))
    if user_id is None:
        return JSONResponse({"detail": "Требуется авторизация"}, status_code=401)

    set_current_user_id(user_id)
    try:
        return await call_next(request)
    finally:
        set_current_user_id(None)


@app.post("/auth/login", tags=["auth"], response_model=TokenOut)
async def login(
    payload: LoginIn, mosres_service: MosResService = Depends(get_mosres_service)
):
    user = await mosres_service.get_user_by_username(payload.username)
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    return TokenOut(token=make_token(user["id"]), username=user["username"])


@app.post("/auth/register", tags=["auth"], response_model=TokenOut)
async def register(
    payload: RegisterIn, mosres_service: MosResService = Depends(get_mosres_service)
):
    """Самостоятельная регистрация: сразу выдаёт токен, как и /auth/login."""
    user_id = await mosres_service.create_user(
        payload.username, hash_password(payload.password)
    )
    if user_id is None:
        raise HTTPException(status_code=409, detail="Такой логин уже занят")
    return TokenOut(token=make_token(user_id), username=payload.username)


@app.get("/auth/me", tags=["auth"], response_model=Me)
async def me(mosres_service: MosResService = Depends(get_mosres_service)):
    user = await mosres_service.get_user(current_user_id())
    if user is None:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    return Me(id=user["id"], username=user["username"])


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get("/file", description="Выгрузка квартир в Excel (с учётом фильтров)")
async def get_excel_file_for_current_date(
    favorites_only: bool = False,
    building_id: int | None = None,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    path, filename = await mosres_service.get_excel_file(
        favorites_only=favorites_only, building_id=building_id
    )
    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/update_data")
async def update_data(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.refresh_all()


@app.get("/aparts", tags=["aparts"], response_model=list[ApartRow])
async def get_aparts(
    building_id: int | None = None,
    building_ids: str | None = None,
    favorites_only: bool = False,
    discount_only: bool = False,
    price_drop_only: bool = False,
    price_rise_only: bool = False,
    new_only: bool = False,
    changed_only: bool = False,
    reserved_only: bool = False,
    available_only: bool = False,
    family_only: bool = False,
    auction_only: bool = False,
    finishing: Literal["FULL", "NO", "STD"] | None = None,
    deadline_max: int | None = None,
    comment_only: bool = False,
    min_price: float | None = None,
    max_price: float | None = None,
    min_discount: float | None = None,
    q: str | None = None,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_aparts_table(
        building_id=building_id,
        building_ids=building_ids,
        favorites_only=favorites_only,
        discount_only=discount_only,
        price_drop_only=price_drop_only,
        price_rise_only=price_rise_only,
        new_only=new_only,
        changed_only=changed_only,
        reserved_only=reserved_only,
        available_only=available_only,
        family_only=family_only,
        auction_only=auction_only,
        finishing=finishing,
        deadline_max=deadline_max,
        comment_only=comment_only,
        min_price=min_price,
        max_price=max_price,
        min_discount=min_discount,
        q=q,
    )


@app.get(
    "/aparts/{new_apart_id}/comments", tags=["comments"], response_model=list[Comment]
)
async def get_apart_comments(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.list_comments(new_apart_id)


@app.post(
    "/aparts/{new_apart_id}/comments", tags=["comments"], response_model=Comment
)
async def post_apart_comment(
    new_apart_id: int,
    payload: CommentIn,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.add_comment(new_apart_id, payload.body)


@app.delete("/comments/{comment_id}", tags=["comments"], status_code=204)
async def delete_apart_comment(
    comment_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    if not await mosres_service.delete_comment(comment_id):
        raise HTTPException(status_code=404, detail="Комментарий не найден")


@app.get("/rates", tags=["dashboard"], response_model=RatesInfo)
async def get_rates():
    kr = await get_key_rate()
    key = kr["rate"]
    return RatesInfo(
        key_rate=key,
        key_rate_date=kr["date"],
        market_rate=round(key + settings.MARKET_RATE_DELTA, 2),
        family_rate=settings.FAMILY_RATE,
    )


@app.get("/dashboard", tags=["dashboard"], response_model=DashboardMetrics)
async def get_dashboard(
    favorites_only: bool = False,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_dashboard(favorites_only=favorites_only)


@app.get(
    "/dashboard/timeseries",
    tags=["dashboard"],
    response_model=list[DashboardPoint],
)
async def get_dashboard_timeseries(
    favorites_only: bool = False,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_dashboard_timeseries(
        favorites_only=favorites_only, date_from=date_from, date_to=date_to
    )


@app.get(
    "/dashboard/changes",
    tags=["dashboard"],
    response_model=list[DashboardChange],
)
async def get_dashboard_changes(
    date: datetime.date | None = None,
    favorites_only: bool = False,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_dashboard_changes(
        date=date, favorites_only=favorites_only
    )


@app.get(
    "/dashboard/pivot",
    tags=["dashboard"],
    response_model=list[PivotPoint],
)
async def get_dashboard_pivot(
    dimension: Literal["date", "district", "rooms", "building", "finishing"],
    metric: Literal[
        "count",
        "reserved",
        "discounted",
        "family",
        "auction",
        "avg_price",
        "avg_price_m",
    ],
    favorites_only: bool = False,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    district: str | None = None,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_dashboard_pivot(
        dimension=dimension,
        metric=metric,
        favorites_only=favorites_only,
        date_from=date_from,
        date_to=date_to,
        district=district,
    )


@app.get(
    "/dashboard/scatter",
    tags=["dashboard"],
    response_model=list[ScatterPoint],
)
async def get_dashboard_scatter(
    favorites_only: bool = False,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_scatter(favorites_only=favorites_only)


@app.get(
    "/dashboard/sankey",
    tags=["dashboard"],
    response_model=list[SankeyRow],
)
async def get_dashboard_sankey(
    favorites_only: bool = False,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_sankey(favorites_only=favorites_only)


@app.get(
    "/dashboard/deadlines",
    tags=["dashboard"],
    response_model=list[DeadlinePoint],
)
async def get_dashboard_deadlines(
    favorites_only: bool = False,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_deadlines(favorites_only=favorites_only)


@app.get(
    "/dashboard/breakdown",
    tags=["dashboard"],
    response_model=list[BreakdownRow],
)
async def get_dashboard_breakdown(
    dimension: Literal["district", "rooms", "finishing"],
    favorites_only: bool = False,
    district: str | None = None,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_breakdown(
        dimension=dimension, favorites_only=favorites_only, district=district
    )


@app.get("/buildings/stats", tags=["buildings"], response_model=list[BuildingStat])
async def get_buildings_stats(
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_buildings_stats()


@app.get("/notifications", tags=["dashboard"], response_model=list[Notification])
async def get_notifications(
    days: int = 14, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_notifications(days=days)


@app.get("/dashboard/metro", tags=["dashboard"], response_model=list[MetroStat])
async def get_metro_stats(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.get_metro_stats()


@app.get(
    "/dashboard/price-history",
    tags=["dashboard"],
    response_model=list[PriceHistoryPoint],
)
async def get_price_history(
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_price_history()


@app.get("/status", tags=["dashboard"], response_model=RefreshStatus)
async def get_status(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.get_refresh_status()


@app.get("/aparts/{new_apart_id}", tags=["aparts"], response_model=ApartRow)
async def get_apart(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    rows = await mosres_service.get_aparts_table(apart_id=new_apart_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Квартира не найдена")
    return rows[0]


@app.get("/aparts/{new_apart_id}/versions", tags=["aparts"])
async def get_apart_versions(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_new_aparts_history(new_apart_id)


@app.get("/favorites", tags=["favorites"], response_model=list[int])
async def get_favorites(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.list_favorites()


@app.post(
    "/favorites/{new_apart_id}", tags=["favorites"], response_model=FavoriteToggleResult
)
async def add_favorite_route(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.add_favorite(new_apart_id)


@app.delete(
    "/favorites/{new_apart_id}", tags=["favorites"], response_model=FavoriteToggleResult
)
async def remove_favorite_route(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.remove_favorite(new_apart_id)


@app.get("/buildings", tags=["buildings"], response_model=list[BuildingRow])
async def get_buildings(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.get_buildings_table()


@app.get(
    "/buildings/{building_id}/price-dynamics",
    tags=["buildings"],
    response_model=list[BuildingPricePoint],
)
async def get_building_price_dynamics(
    building_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_building_price_dynamics(building_id)


@app.get("/buildings/{building_id}/versions", tags=["buildings"])
async def get_building_versions(
    building_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_buildings_history(building_id)


@dataclass
class TorgiLotFilters:
    """Фильтры таблицы лотов: один список параметров на /torgi/lots и
    /torgi/file, иначе выгрузка расходится с тем, что видно в таблице."""

    open_only: bool = False
    status: str | None = None
    category: str | None = None
    brand: str | None = None
    year_min: int | None = None
    year_max: int | None = None
    min_price: float | None = None
    max_price: float | None = None
    max_mileage: int | None = None
    price_drop_only: bool = False
    with_plate_only: bool = False
    fav_only: bool = False
    watch_only: bool = False
    valid_plate_only: bool = False
    plate_region: str | None = None
    q: str | None = None


@app.get("/torgi/lots", tags=["torgi"], response_model=list[TorgiLotRow])
async def get_torgi_lots(
    filters: TorgiLotFilters = Depends(),
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    """Лоты torgi.mos.ru по транспорту. По умолчанию — весь архив;
    `open_only=true` оставляет только те, где идёт приём заявок;
    `watch_only=true` — только подошедшие под паттерны номера пользователя."""
    return await torgi_service.get_lots_table(**asdict(filters))


@app.get("/torgi/stats", tags=["torgi"], response_model=list[TorgiCategoryStat])
async def get_torgi_stats(torgi_service: TorgiService = Depends(get_torgi_service)):
    return await torgi_service.get_stats()


@app.get("/torgi/file", tags=["torgi"], description="Выгрузка лотов в Excel")
async def get_torgi_excel_file(
    filters: TorgiLotFilters = Depends(),
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    path, filename = await torgi_service.get_excel_file(**asdict(filters))
    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/torgi/update_data", tags=["torgi"])
async def update_torgi_data(torgi_service: TorgiService = Depends(get_torgi_service)):
    return await torgi_service.update_all_data()


@app.get("/torgi/favorites", tags=["torgi"], response_model=list[int])
async def get_torgi_favorites(
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    return await torgi_service.list_favorites()


@app.post(
    "/torgi/favorites/{lot_id}",
    tags=["torgi"],
    response_model=TorgiFavoriteToggleResult,
)
async def add_torgi_favorite_route(
    lot_id: int, torgi_service: TorgiService = Depends(get_torgi_service)
):
    return await torgi_service.add_favorite(lot_id)


@app.delete(
    "/torgi/favorites/{lot_id}",
    tags=["torgi"],
    response_model=TorgiFavoriteToggleResult,
)
async def remove_torgi_favorite_route(
    lot_id: int, torgi_service: TorgiService = Depends(get_torgi_service)
):
    return await torgi_service.remove_favorite(lot_id)


@app.get("/torgi/presets", tags=["torgi"], response_model=list[PlatePreset])
async def get_plate_presets(
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    """Готовые паттерны номеров: `preset` отправляется в POST /torgi/watches."""
    return torgi_service.list_presets()


@app.get("/torgi/watches", tags=["torgi"], response_model=list[PlateWatch])
async def get_plate_watches(
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    return await torgi_service.list_watches()


@app.post("/torgi/watches", tags=["torgi"], response_model=PlateWatch)
async def add_plate_watch_route(
    payload: PlateWatchIn,
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    """Маска языка масок либо `preset` из /torgi/presets. Кривая маска — 422.
    Повторный такой же паттерн идемпотентен: вернётся существующий."""
    try:
        return await torgi_service.add_watch(
            mask=payload.mask, preset=payload.preset, label=payload.label
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))


@app.delete("/torgi/watches/{watch_id}", tags=["torgi"], status_code=204)
async def delete_plate_watch_route(
    watch_id: int, torgi_service: TorgiService = Depends(get_torgi_service)
):
    if not await torgi_service.delete_watch(watch_id):
        raise HTTPException(status_code=404, detail="Паттерн не найден")


@app.get(
    "/torgi/notifications", tags=["torgi"], response_model=list[TorgiNotification]
)
async def get_torgi_notifications(
    days: int = 30, torgi_service: TorgiService = Depends(get_torgi_service)
):
    """Одна лента: `kind=plate_match` — номер подошёл под паттерн,
    `kind=lot_change` — изменился избранный лот."""
    return await torgi_service.get_notifications(days=days)


@app.get("/torgi/dashboard", tags=["torgi"], response_model=TorgiDashboard)
async def get_torgi_dashboard(
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    return await torgi_service.get_dashboard()


@app.get("/torgi/pivot", tags=["torgi"], response_model=list[TorgiPivotRow])
async def get_torgi_pivot_route(
    dimension: str,
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    """Разбивка лотов по одному измерению из белого списка
    TorgiService.PIVOT_DIMS; всё остальное — 422."""
    if dimension not in TorgiService.PIVOT_DIMS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Неизвестное измерение: {dimension}. "
                f"Доступны: {', '.join(TorgiService.PIVOT_DIMS)}"
            ),
        )
    return await torgi_service.get_pivot(dimension)


@app.get("/torgi/points", tags=["torgi"], response_model=list[TorgiPoint])
async def get_torgi_points(
    torgi_service: TorgiService = Depends(get_torgi_service),
):
    """Тонкий массив под scatter, карту и гистограмму регионов номеров."""
    return await torgi_service.get_points()


@app.get("/torgi/lots/{lot_id}", tags=["torgi"], response_model=TorgiLotRow)
async def get_torgi_lot(
    lot_id: int, torgi_service: TorgiService = Depends(get_torgi_service)
):
    rows = await torgi_service.get_lots_table(lot_id=lot_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Лот не найден")
    return rows[0]


@app.get(
    "/torgi/lots/{lot_id}/versions",
    tags=["torgi"],
    response_model=list[TorgiLotVersion],
)
async def get_torgi_lot_versions(
    lot_id: int, torgi_service: TorgiService = Depends(get_torgi_service)
):
    return await torgi_service.get_lot_history(lot_id)


@dataclass
class TorgiObjectFilters:
    """Фильтры таблицы лотов недвижимости (см. src/sql/torgi_objects.sql)."""

    object_type: str | None = None
    district: str | None = None
    region: str | None = None
    fav_only: bool = False
    live_only: bool = False
    sold_only: bool = False
    price_drop_only: bool = False
    min_price: float | None = None
    max_price: float | None = None
    min_area: float | None = None
    max_area: float | None = None
    rooms: int | None = None
    q: str | None = None
    # архив портала — сотни тысяч лотов, поэтому выдача всегда ограничена
    limit: int = 500


@app.get("/torgi/objects", tags=["torgi-недвижимость"], response_model=list[TorgiObjectRow])
async def get_torgi_objects_route(
    filters: TorgiObjectFilters = Depends(),
    service: TorgiObjectsService = Depends(get_torgi_objects_service),
):
    """Лоты недвижимости torgi.mos.ru: квартиры, комнаты, машино-места,
    нежилые помещения, здания, земельные участки и прочее. По умолчанию — весь
    архив, живые лоты идут первыми; `live_only=true` оставляет только те, где
    приём заявок ещё идёт или торги впереди."""
    return await service.list_objects(**asdict(filters))


@app.get(
    "/torgi/objects/stats",
    tags=["torgi-недвижимость"],
    response_model=list[TorgiObjectStat],
)
async def get_torgi_objects_stats_route(
    service: TorgiObjectsService = Depends(get_torgi_objects_service),
):
    """Сводка по типам объектов: сколько лотов, сколько живых, средняя цена."""
    return await service.get_stats()


@app.get(
    "/torgi/objects/breakdown",
    tags=["torgi-недвижимость"],
    response_model=list[TorgiObjectBreakdownRow],
)
async def get_torgi_objects_breakdown_route(
    dimension: Literal["region", "district", "object_type", "house_type", "rooms"],
    object_type: str | None = None,
    service: TorgiObjectsService = Depends(get_torgi_objects_service),
):
    """Топ-20 значений измерения: сколько лотов, сколько живых, средние цены."""
    return await service.get_breakdown(dimension, object_type)


@app.get(
    "/torgi/objects/favorites", tags=["torgi-недвижимость"], response_model=list[int]
)
async def get_torgi_object_favorites(
    service: TorgiObjectsService = Depends(get_torgi_objects_service),
):
    return await service.list_favorites()


@app.post(
    "/torgi/objects/favorites/{lot_id}",
    tags=["torgi-недвижимость"],
    response_model=TorgiObjectFavoriteToggleResult,
)
async def add_torgi_object_favorite_route(
    lot_id: int, service: TorgiObjectsService = Depends(get_torgi_objects_service)
):
    return await service.add_favorite(lot_id)


@app.delete(
    "/torgi/objects/favorites/{lot_id}",
    tags=["torgi-недвижимость"],
    response_model=TorgiObjectFavoriteToggleResult,
)
async def remove_torgi_object_favorite_route(
    lot_id: int, service: TorgiObjectsService = Depends(get_torgi_objects_service)
):
    return await service.remove_favorite(lot_id)


@app.get("/torgi/objects/update_data", tags=["torgi-недвижимость"])
async def update_torgi_objects_data(
    detail_budget: int | None = None,
    service: TorgiObjectsService = Depends(get_torgi_objects_service),
):
    """Прогон вручную. Список читается целиком, карточки — по очереди: живые
    лоты, затем недавно отторгованные без итоговой цены, затем архив без
    карточки. detail_budget ограничивает число карточек за прогон."""
    return await service.update_all_data(
        detail_budget=detail_budget or settings.TORGI_OBJECTS_DETAIL_BUDGET
    )


@app.get(
    "/torgi/objects/{lot_id}",
    tags=["torgi-недвижимость"],
    response_model=TorgiObjectRow,
)
async def get_torgi_object(
    lot_id: int, service: TorgiObjectsService = Depends(get_torgi_objects_service)
):
    row = await service.get_object(lot_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Лот не найден")
    return row


@app.get(
    "/torgi/objects/{lot_id}/versions",
    tags=["torgi-недвижимость"],
    response_model=list[TorgiObjectVersion],
)
async def get_torgi_object_versions_route(
    lot_id: int, service: TorgiObjectsService = Depends(get_torgi_objects_service)
):
    return await service.get_versions(lot_id)
