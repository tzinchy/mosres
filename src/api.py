from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from src.service import update_all_data_and_get_new_file, insert_data

app = FastAPI()

# Define the origins allowed to access your API backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          
    allow_credentials=False,      
    allow_methods=["GET", "POST"],        
    allow_headers=["*"],          
)

@app.get('/file')
async def get_data_from_db():
    path, filename = await update_all_data_and_get_new_file()
    return FileResponse(path=path, filename=filename, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.post('/backup_from_file')
async def backup_from_file(file_name : str):
    await insert_data(file_name=file_name)