from fastapi import APIRouter, UploadFile, File
import pandas as pd

router = APIRouter()

@router.post("/upload/monthly-plan")
async def upload_monthly(file: UploadFile = File(...)):
    df = pd.read_excel(file.file)

    data = df.to_dict(orient="records")

    return {"data": data}