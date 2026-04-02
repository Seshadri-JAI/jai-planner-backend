from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import DailyActual
from models import DailyPlan, DailyActual

router = APIRouter()

actual_data = []

@router.post("/update")
def update_actual(entry: dict):
    actual_data.append(entry)
    return {"status": "updated"}

from fastapi import Body

@router.post("/add-actual")
def add_actual(data: list = Body(...), db: Session = Depends(get_db)):

    for row in data:
        entry = DailyActual(
            date=row["date"],
            shift=row["shift"],
            part_number=row["part_number"],
            stage=row["stage"],
            actual_qty=row["actual_qty"]
        )

        db.add(entry)

    db.commit()

    return {"message": "Actual saved"}



