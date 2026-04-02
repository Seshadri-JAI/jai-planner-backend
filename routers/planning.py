from fastapi import APIRouter, UploadFile, File, Depends
from collections import defaultdict
from services.stage_planning import generate_stage_plan
from services.carry_forward import apply_carry_forward
from services.priority import apply_priority
import pandas as pd
from sqlalchemy.orm import Session
from database import get_db
from models import MonthlyPlan, Assembly, Leaf
from services.planning_service import generate_plan
from database import SessionLocal
from models import AssemblyPlan
from fastapi import Depends
from models import DayStatus
from datetime import datetime, timedelta
from models import DailyActual, DailyPlan



router = APIRouter()

def get_previous_backlog(db, date, part, shift):

    from models import DailyPlan, DailyActual

    prev_date = (
        datetime.strptime(date, "%Y-%m-%d") - timedelta(days=1)
    ).date()

    prev_plan = db.query(DailyPlan).filter_by(
        date=prev_date,
        part_number=part,
        shift=shift
    ).first()

    planned = prev_plan.planned_qty if prev_plan else 0

    prev_actuals = db.query(DailyActual).filter_by(
        date=prev_date,
        part_number=part,
        shift=shift
    ).all()

    assembly = sum(int(a.actual_qty) for a in prev_actuals if a.stage == "Assembly")
    qa = sum(int(a.actual_qty) for a in prev_actuals if a.stage == "QA")

    prev_assy_pending = max(planned - assembly, 0)
    prev_qa_pending = max(assembly - qa, 0)

    return prev_assy_pending, prev_qa_pending

@router.post("/upsert-monthly-plan")
def upsert_plan(data: list, db: Session = Depends(get_db)):

    for row in data:

        existing = db.query(MonthlyPlan).filter_by(
            part_number=row["part_number"]
        ).first()

        if existing:
            existing.qty = row["qty"]
        else:
            db.add(MonthlyPlan(
                part_number=row["part_number"],
                qty=row["qty"]
            ))

    db.commit()

    return {"message": "Plan updated"}

@router.post("/save-rm-adjustment")
def save_rm(data: list):

    # Save adjustments (later to DB)

    return {"message": "RM adjustments saved"}

@router.post("/stage-plan")
def stage_plan(data: dict):

    net_req = data["net_req"]

    plan = generate_stage_plan(net_req)

    return {"stage_plan": plan}


from models import Assembly
from fastapi import UploadFile, File
import pandas as pd

@router.post("/upload-assembly-master")
async def upload_assembly_master(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    import pandas as pd

    df = pd.read_excel(file.file)
    df.columns = df.columns.str.strip().str.lower()

    required_cols = ["part_number", "weight"]
    for col in required_cols:
        if col not in df.columns:
            return {"error": f"Missing column: {col}"}

    response = []

    for _, row in df.iterrows():

        # ✅ DEFINE FIRST
        part_number = str(row.get("part_number")).strip()
        weight = row.get("weight")

        name = row.get("name", "")
        customer = row.get("customer", "")

        if not part_number or not weight:
            response.append({
                "part_number": part_number,
                "status": "Invalid"
            })
            continue

        # ✅ THEN USE
        existing = db.query(Assembly).filter_by(part_number=part_number).first()

        if existing:
            existing.weight = float(weight)
            existing.name = name
            existing.customer = customer
        else:
            db.add(Assembly(
                part_number=part_number,
                weight=float(weight),
                name=name,
                customer=customer
            ))

        response.append({
            "part_number": part_number,
            "weight": weight,
            "status": "OK"
        })

    db.commit()

    return {
        "message": "Assembly master uploaded successfully",
        "data": response
    }
@router.post("/priority")
def priority(data: dict):

    sorted_plan = apply_priority(data["plan"])

    return {"sorted": sorted_plan}

@router.post("/upload-monthly-plan")
async def upload_monthly_plan(file: UploadFile = File(...), db: Session = Depends(get_db)):

    import pandas as pd

    df = pd.read_excel(file.file)

    # Normalize columns
    df.columns = df.columns.str.strip().str.lower()

    records = df.to_dict(orient="records")

    db.query(MonthlyPlan).delete()

    response_data = []

    for row in records:
        part_number = row.get("part_number")
        qty = row.get("quantity") or row.get("qty")

        if not part_number or not qty:
            response_data.append({
                "part_number": part_number,
                "quantity": qty,
                "status": "Invalid Row"
            })
            continue

        assembly = db.query(Assembly).filter_by(part_number=part_number).first()

        db.add(MonthlyPlan(
            part_number=part_number,
            qty=int(qty)
        ))

        response_data.append({
            "part_number": part_number,
            "quantity": qty,
            "status": "OK"
        })

    db.commit()

    return {
        "message": "Upload completed",
        "data": response_data
    }

@router.post("/generate-plan")
def generate_plan_api(db: Session = Depends(get_db)):

    from services.planning_service import generate_plan
    from services.planning_service import calculate_rm_requirement

    # FIXED
    net_leaf_req = generate_plan(db)

    leaf_data, rm_summary = calculate_rm_requirement(db, net_leaf_req)

    return {
        "message": "Plan generated",
        "leaf_data": leaf_data,
        "rm_summary": rm_summary
    }

from fastapi import Body

@router.post("/save-rm")
def save_rm(data: list, db: Session = Depends(get_db)):

    # store adjusted RM
    return {"message": "Saved"}

@router.post("/rm-stock")
def set_rm_stock(data: list, db: Session = Depends(get_db)):

    from models import RMStock

    db.query(RMStock).delete()

    for item in data:
        db.add(RMStock(
            section=item["section"],
            available_qty=item["available"]
        ))

    db.commit()

    return {"message": "RM Stock Updated"}

@router.post("/rm-shortage")
def calculate_rm_shortage(data: list, db: Session = Depends(get_db)):

    from models import RMStock

    result = []

    for item in data:
        section = item.get("section")

        # Use adjusted if available, else auto
        required = float(item.get("adjusted_rm") or item.get("auto_rm") or item.get("rm_required") or 0)

        stock = db.query(RMStock).filter_by(section=section).first()
        available = stock.available_qty if stock else 0

        shortage = required - available

        result.append({
            "section": section,
            "required": required,
            "available": available,
            "shortage": shortage
        })

    return {"data": result}

@router.post("/set-daily-plan")
def set_daily_plan(data: list = Body(...), db: Session = Depends(get_db)):

    from models import DailyPlan

    if not data:
        return {"message": "No data"}

    date = data[0]["date"]

    # Clear existing plan for that date
    db.query(DailyPlan).filter_by(date=date).delete()

    for row in data:
        db.add(DailyPlan(
            date=datetime.strptime(row["date"], "%Y-%m-%d").date(),
            shift=row["shift"],
            part_number=row["part_number"],
            planned_qty=row["qty"],
            priority=row["priority"],
            line=row.get("line", "Line 1 (Conv)")   # default
        ))

    db.commit()

    return {"message": "Daily plan saved"}

@router.get("/get-daily-plan")
def get_daily_plan(date: str, db: Session = Depends(get_db)):

    from models import DailyPlan

    date_obj = datetime.strptime(date, "%Y-%m-%d").date()

    plans = db.query(DailyPlan).filter_by(date=date_obj).all()
    

    result = []

    for p in plans:

        assembly = db.query(Assembly).filter_by(part_number=p.part_number).first()
        weight = assembly.weight if assembly else 0

        result.append({
            "date": p.date,
            "shift": p.shift,
            "part_number": p.part_number,
            "qty": p.planned_qty,
            "priority": p.priority,
            "line": p.line,
            "weight": weight   # ✅ ADD
        })

    return {"data": result}

@router.get("/get-weight")
def get_weight(part: str, db: Session = Depends(get_db)):

    from models import Assembly

    assembly = db.query(Assembly).filter_by(part_number=part).first()

    return {
        "weight": assembly.weight if assembly else 0
    }

@router.post("/upload-leaf-master")
async def upload_leaf_master(file: UploadFile = File(...), db: Session = Depends(get_db)):

    import pandas as pd

    df = pd.read_excel(file.file)

    # Normalize columns
    df.columns = df.columns.str.strip().str.lower()

    records = df.to_dict(orient="records")

    # Clear existing data
    db.query(Leaf).delete()

    response = []

    for row in records:

        part_number = str(row.get("part_number")).strip()
        position = str(row.get("position")).strip()
        section = row.get("section")
        weight = row.get("weight")

        # Validation
        if not part_number or not position or not section or not weight:
            continue

        db.add(Leaf(
            part_number=part_number,
            position=position,
            section=section,
            weight=float(weight)
        ))

        response.append({
            "part_number": part_number,
            "position": position,
            "status": "OK"
        })

    db.commit()

    return {
        "message": "Leaf master uploaded",
        "data": response
    }

    
@router.get("/debug/wip")
def debug_wip():
    return {"message": "Not implemented"}

@router.get("/debug/rm")
def debug_rm():
    return {"message": "Not implemented"}

@router.get("/debug/leaf")
def debug_leaf(db: Session = Depends(get_db)):
    return db.query(Leaf).all()

@router.get("/debug/plan")
def debug_plan(db: Session = Depends(get_db)):
    return db.query(MonthlyPlan).all()

from fastapi import Body

@router.post("/close-day")
def close_day(date: str, db: Session = Depends(get_db)):

    from models import DayStatus
    from datetime import datetime, timedelta

    status = db.query(DayStatus).filter_by(date=date).first()

    if not status:
        status = DayStatus(date=date, is_closed=True)
        db.add(status)
    else:
        status.is_closed = True

    # 🔥 AUTO GENERATE NEXT DAY PLAN
    next_date = (
        datetime.strptime(date, "%Y-%m-%d") + timedelta(days=1)
    ).strftime("%Y-%m-%d")

    generate_next_day_plan({
        "date": date,
        "next_date": next_date
    }, db)

    db.commit()

    return {"message": "Day closed + plan carried forward"}

@router.get("/day-status")
def get_day_status(date: str, db: Session = Depends(get_db)):

    status = db.query(DayStatus).filter_by(date=date).first()

    return {
        "closed": status.is_closed if status else False
    }

@router.get("/execution-table")
def get_execution_table(date: str, db: Session = Depends(get_db)):

    from collections import defaultdict
    from models import DailyPlan, DailyActual, Assembly
    from datetime import datetime

    date_obj = datetime.strptime(date, "%Y-%m-%d").date()

    plans = db.query(DailyPlan).filter_by(date=date_obj).all()
    actuals = db.query(DailyActual).filter_by(date=date_obj).all()

    # 🔥 PRELOAD WEIGHTS (FAST)
    assembly_data = db.query(Assembly).all()
    weight_map = {a.part_number: a.weight for a in assembly_data}

    table = []

    for p in plans:
        part = p.part_number
        shift = p.shift  

        # -------------------------
        # TODAY ACTUALS
        # -------------------------
        assembly_qty = sum(
            int(a.actual_qty) for a in actuals
            if a.part_number == part and a.stage == "Assembly" and a.shift == shift
        )

        qa_qty = sum(
            int(a.actual_qty) for a in actuals
            if a.part_number == part and a.stage == "QA" and a.shift == shift
        )

        # -------------------------
        # PREVIOUS BACKLOG
        # -------------------------
        prev_assy_pending, prev_qa_pending = get_previous_backlog(
            db, date, part, shift
        )

        # -------------------------
        # FINAL CALCULATION
        # -------------------------
        total_for_qa = prev_qa_pending + assembly_qty
        qa_pending = max(total_for_qa - qa_qty, 0)

        assy_pending = max(p.planned_qty - assembly_qty - prev_qa_pending, 0)

        # -------------------------
        # STAGE MAP
        # -------------------------
        stage_map = {}

        for a in actuals:
            if a.part_number == part and a.shift == shift:

                # 🔥 Skip numeric stages
                if a.stage in ["Assembly", "QA"]:
                    continue

                # 🔥 Store string directly
                stage_map[a.stage] = a.actual_qty

        # -------------------------
        # WEIGHT + MT
        # -------------------------
        weight = weight_map.get(part, 0)

        mt = round((qa_qty * weight) / 1000, 1)

        # -------------------------
        # APPEND
        # -------------------------
        table.append({
            "part_number": part,
            "shift": shift,
            "line": p.line,
            "priority": p.priority,
            "planned": p.planned_qty,
            "actual": assembly_qty,
            "qa": qa_qty,
            "assy_pending": assy_pending,
            "qa_pending": qa_pending,
            "prev_qa_pending": prev_qa_pending,
            "weight": weight,      # ✅ CRITICAL FIX
            "mt": mt,
            "stages": {
                "RM": stage_map.get("RM", ""),
                "SPVC": stage_map.get("SPVC", ""),
                "BHT": stage_map.get("BHT", ""),
                "Parabolic": stage_map.get("Parabolic", ""),
                "HT": stage_map.get("HT", ""),
                "Comp": stage_map.get("Comp", ""),
                "Paint": stage_map.get("Paint", "")
            }
        })

    # -------------------------
    # SORTING (SHIFT → LINE → PRIORITY)
    # -------------------------
    line_order = {
        "Line 1 (Conv)": 1,
        "Line 2 (HP)": 2,
        "Line 3 (New)": 3,
        "Line 4 (LP)": 4
    }

    table = sorted(
        table,
        key=lambda x: (
            x["shift"],
            line_order.get(x["line"], 99),
            x.get("priority", 999)
        )
    )

    return table
import re
@router.post("/execution-save")
def save_execution(data: dict, db: Session = Depends(get_db)):


    date = datetime.strptime(data["date"], "%Y-%m-%d").date()
    rows = data["rows"]

    for row in rows:
        part = row["part_number"]
        shift = row.get("shift", "A")

        plan = db.query(DailyPlan).filter_by(
            date=date,
            part_number=part,
            shift=shift
        ).first()

        if plan:
            plan.line = row.get("line", plan.line)

        # -------------------------
        # STAGE DATA
        # -------------------------
        for stage, raw_value in row["stages"].items():

            # 🔥 ONLY NON-NUMERIC STAGES → STRING
            if stage in ["Assembly", "QA"]:
                continue

            value = str(raw_value) if raw_value is not None else ""

            record = db.query(DailyActual).filter_by(
                date=date,
                part_number=part,
                stage=stage,
                shift=shift
            ).first()

            if record:
                record.actual_qty = value
            else:
                db.add(DailyActual(
                    date=date,
                    part_number=part,
                    stage=stage,
                    actual_qty=value,
                    shift=shift
                ))

        # -------------------------
        # ASSEMBLY
        # -------------------------
        record = db.query(DailyActual).filter_by(
            date=date,
            part_number=part,
            stage="Assembly",
            shift=shift
        ).first()

        if record:
            record.actual_qty = row.get("actual", 0)
        else:
            db.add(DailyActual(
                date=date,
                part_number=part,
                stage="Assembly",
                actual_qty=row.get("actual", 0),
                shift=shift
            ))

        # -------------------------
        # QA
        # -------------------------
        record = db.query(DailyActual).filter_by(
            date=date,
            part_number=part,
            stage="QA",
            shift=shift
        ).first()

        if record:
            record.actual_qty = row.get("qa", 0)
        else:
            db.add(DailyActual(
                date=date,
                part_number=part,
                stage="QA",
                actual_qty=row.get("qa", 0),
                shift=shift
            ))

    db.commit()

    return {"message": "Saved"}

@router.post("/generate-next-day-plan")
def generate_next_day_plan(data: dict, db: Session = Depends(get_db)):

    from models import DailyPlan, DailyActual

    date = data["date"]
    next_date = data["next_date"]

    date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    next_date_obj = datetime.strptime(next_date, "%Y-%m-%d").date()

    plans = db.query(DailyPlan).filter_by(date=date_obj).all()
    db.query(DailyPlan).filter_by(date=next_date_obj).delete()

    actuals = db.query(DailyActual).filter_by(date=date_obj).all()

    # Clear next day plan
    db.query(DailyPlan).filter_by(date=next_date_obj).delete()

    for p in plans:
        part = p.part_number

        # -------------------------
        # TODAY ACTUALS
        # -------------------------
        assembly = sum(
            a.actual_qty for a in actuals
            if a.part_number == part and a.stage == "Assembly"
        )

        qa = sum(
            a.actual_qty for a in actuals
            if a.part_number == part and a.stage == "QA"
        )

        # -------------------------
        # BACKLOG
        # -------------------------
        assy_pending = max(p.planned_qty - assembly, 0)
        qa_pending = max(assembly - qa, 0)

        # -------------------------
        # FINAL NEXT DAY PLAN
        # -------------------------
        next_plan = p.planned_qty - qa   # ✅ YOUR REQUIREMENT

        if next_plan > 0:
            db.add(DailyPlan(
                date=next_date_obj,
                shift="A",
                part_number=part,
                planned_qty=next_plan,
                priority=p.priority,
                line=p.line   # 🔥 VERY IMPORTANT
            ))

    db.commit()

    return {"message": "Next day plan generated"}

id="save_customer_critical"
@router.post("/customer-critical-save")
def save_customer_critical(data: dict, db: Session = Depends(get_db)):

    from models import CustomerCritical
    from datetime import datetime

    date = datetime.strptime(data["date"], "%Y-%m-%d").date()

    # clear existing for date
    db.query(CustomerCritical).filter_by(date=date).delete()

    for row in data["rows"]:
        db.add(CustomerCritical(
            date=date,
            part_number=row.get("part_number"),
            customer=row.get("customer"),
            quantity=row.get("quantity", 0),
            line_stoppage_deadline=row.get("line_stoppage_deadline", ""),
            target_time=row.get("target_time", "")
        ))

    db.commit()

    return {"message": "Saved"}

id="get_customer_critical"
@router.get("/customer-critical")
def get_customer_critical(date: str, db: Session = Depends(get_db)):

    from models import CustomerCritical
    from datetime import datetime

    date_obj = datetime.strptime(date, "%Y-%m-%d").date()

    data = db.query(CustomerCritical).filter_by(date=date_obj).all()

    return [
        {
            "part_number": r.part_number,
            "customer": r.customer,
            "quantity": r.quantity,
            "line_stoppage_deadline": r.line_stoppage_deadline,
            "target_time": r.target_time
        }
        for r in data
    ]
