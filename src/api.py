import datetime
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from src.rates import get_key_rate
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from src.auth import (
    current_user_id,
    make_token,
    parse_token,
    set_current_user_id,
    verify_password,
)
from src.config import settings
from src.depends import get_mosres_service, MosResService
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
    description="Удобное api для получения информации с https://xn--80aae5aibotfo5h.xn--p1ai/. По умолчанию собирает данные по жилой недвижомсти",
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
PUBLIC_PATHS = {"/", "/auth/login", "/docs", "/redoc", "/openapi.json"}


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
