from fastapi import FastAPI, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from src.depends import get_mosres_service, MosResService

app = FastAPI(
    title="mosres-api",
    version="0.1.0",
    description="Удобное api для получения информации с https://xn--80aae5aibotfo5h.xn--p1ai/. По умолчанию собирает данные по жилой недвижомсти",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
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
    await mosres_service.update_all_data()


@app.get("/new_aparts", tags=["new-apart"])
async def get_new_apats(new_aparts_ids : list[int] | None = None, mosres_service: MosResService = Depends(get_mosres_service)):
    await mosres_service.get_new_aparts_table(new_aparts_ids=new_aparts_ids)


@app.get("/new_aparts/{new_apart_id}/versions", tags=["new-apart"])
async def get_new_apart_versions(new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.get_new_aparts_history(new_apart_id)


@app.get("/buildings")
async def get_buildings(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.get_buildings_table()


@app.get("/buildings/{building_id}/versions", tags=["buildings"])
async def get_buildings_versions(building_id: int, mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.get_buildings_history(building_id)
