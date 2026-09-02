from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.depends import get_mosres_service, MosResService
from src.scheduler import build_scheduler
from src.schemas import ApartRow


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


@app.get("/file", description="Для получения файла со всей информацией")
async def get_excel_file_for_current_date(mosres_service : MosResService = Depends(get_mosres_service)):
    path, filename = await mosres_service.get_excel_file()
    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/update_data")
async def update_data(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.update_all_data()


@app.get("/aparts", tags=["aparts"], response_model=list[ApartRow])
async def get_aparts(
    building_id: int | None = None,
    favorites_only: bool = False,
    discount_only: bool = False,
    price_drop_only: bool = False,
    q: str | None = None,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_aparts_table(
        building_id=building_id,
        favorites_only=favorites_only,
        discount_only=discount_only,
        price_drop_only=price_drop_only,
        q=q,
    )


@app.get("/aparts/{new_apart_id}/versions", tags=["aparts"])
async def get_apart_versions(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_new_aparts_history(new_apart_id)


@app.get("/buildings", tags=["buildings"])
async def get_buildings(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.get_buildings_table()


@app.get("/buildings/{building_id}/versions", tags=["buildings"])
async def get_building_versions(
    building_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_buildings_history(building_id)
