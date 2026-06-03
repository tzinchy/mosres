from fastapi import FastAPI
from fastapi.responses import FileResponse

from src.service import update_all_data_and_get_new_file, insert_data

app = FastAPI()

@app.get('/data')
async def get_data_from_db():
    path, filename = await update_all_data_and_get_new_file()
    return FileResponse(path=path, filename=filename, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.get('/test')
async def test():
    await insert_data()