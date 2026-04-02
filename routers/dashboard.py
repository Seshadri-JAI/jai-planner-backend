from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import defaultdict
from models import DailyActual, Assembly
from collections import defaultdict

from database import get_db
from models import StagePlan, DailyActual, DailyPlan, Assembly

router = APIRouter()

FINAL_STAGE = "QA"
ALL_STAGES = ["RM", "SPVC", "Parabolic", "BHT", "HT", "Comp", "Paint", "Assembly","QA"]
SHIFTS = ["A", "B", "C"]


# ============================
# LIVE DASHBOARD
# ============================
@router.get("/live")
def get_live_dashboard(db: Session = Depends(get_db)):

    stage_data = db.query(StagePlan).all()
    actual_data = db.query(DailyActual).all()
    plans = db.query(DailyPlan).all()

    # ---------------------------
    # KPI
    # ---------------------------
    assembly_total = sum(
        int(a.actual_qty or 0) for a in actual_data if a.stage == FINAL_STAGE
    )
    planned_total = sum(p.planned_qty for p in plans)

    completion = (assembly_total / planned_total * 100) if planned_total else 0

    # ---------------------------
    # STAGE PERFORMANCE
    # ---------------------------
    stage_plan = defaultdict(int)
    stage_actual = defaultdict(int)

    for s in stage_data:
        stage_plan[s.stage] += s.planned_qty

    for a in actual_data:
        try:
            stage_actual[a.stage] += int(a.actual_qty)
        except:
            pass   # ignore remarks

    stages = []
    for stage in ALL_STAGES:
        planned = stage_plan.get(stage, 0)
        actual = stage_actual.get(stage, 0)

        percent = (actual / planned * 100) if planned else 0

        stages.append({
            "stage": stage,
            "value": round(percent, 2),
            "planned": planned,
            "actual": actual
        })

    # ---------------------------
    # SHIFT SUMMARY
    # ---------------------------
    shift_map = defaultdict(int)
    for a in actual_data:
        try:
            shift_map[a.shift] += int(a.actual_qty)
        except:
            pass

    shift_data = [
        {"shift": s, "actual": shift_map.get(s, 0)}
        for s in SHIFTS
    ]

    return {
        "kpi": {
            "completion": round(completion, 2),
            "assembly_completion": assembly_total
        },
        "stages": stages,
        "shift": shift_data
    }


# ============================
# PLAN VS ACTUAL (ENTERPRISE)
# ============================
@router.get("/plan-vs-actual")
def plan_vs_actual(date: str, db: Session = Depends(get_db)):

    plans = db.query(DailyPlan).filter_by(date=date).all()
    actuals = db.query(DailyActual).filter_by(date=date).all()

    # ---------------------------
    # PREP MAPS
    # ---------------------------
    plan_map = defaultdict(int)
    actual_map = defaultdict(int)
    part_shift_actual = defaultdict(lambda: defaultdict(int))

    shift_plan = defaultdict(int)
    shift_actual = defaultdict(int)
    line_map = {}

    # ---------------------------
    # PLAN DATA
    # ---------------------------
    for p in plans:
        line_map[p.part_number] = p.line
        plan_map[p.part_number] += p.planned_qty
        shift_plan[p.shift] += p.planned_qty

    # ---------------------------
    # ACTUAL DATA (ASSEMBLY ONLY)
    # ---------------------------
    for a in actuals:
        if a.stage != FINAL_STAGE:
            continue

        actual_map[a.part_number] += int(a.actual_qty)
        part_shift_actual[a.part_number][a.shift] += int(a.actual_qty)
        shift_actual[a.shift] += int(a.actual_qty)

    # ---------------------------
    # PRELOAD ASSEMBLY WEIGHTS (OPTIMIZED 🚀)
    # ---------------------------
    assembly_data = db.query(Assembly).all()
    weight_map = {a.part_number: a.weight for a in assembly_data}

    # ---------------------------
    # BUILD TABLE
    # ---------------------------
    table = []
    total_plan = 0
    total_actual = 0

    for part, planned in plan_map.items():

        actual = actual_map.get(part, 0)
        balance = planned - actual

        assembly_qty = sum(
            a.actual_qty for a in actuals
            if a.part_number == part and a.stage == "Assembly"
        )

        # 🔥 QA PENDING
        qa_pending = assembly_qty - actual

        # ---------------------------
        # STATUS
        # ---------------------------
        achievement = (actual / planned * 100) if planned else 0

        if achievement >= 100:
            status = "ok"
        elif achievement >= 70:
            status = "risk"
        else:
            status = "delay"

        # ---------------------------
        # SHIFT SPLIT
        # ---------------------------
        shifts = {
            s: part_shift_actual[part].get(s, 0)
            for s in SHIFTS
        }

        # ---------------------------
        # WEIGHT + MT
        # ---------------------------
        weight = weight_map.get(part, 0)

        if weight == 0:
            print(f"⚠️ Missing assembly weight for {part}")

        mt = round((actual * weight) / 1000, 2)

        # ---------------------------
        # APPEND
        # ---------------------------
        table.append({
            "part_number": part,
            "planned": planned,
            "actual": actual,
            "balance": balance,
            "mt": mt,
            "line": line_map.get(part, "Line Not Assigned"),
            "shifts": shifts,
            "status": status,
            "achievement": round(achievement, 1),
            "qa_pending": qa_pending,
        })

        total_plan += planned
        total_actual += actual

    completion = (total_actual / total_plan * 100) if total_plan else 0

    shift_data = [
        {
            "shift": s,
            "planned": shift_plan.get(s, 0),
            "actual": shift_actual.get(s, 0)
        }
        for s in SHIFTS
    ]

    return {
        "table": table,
        "kpi": {
            "total_plan": total_plan,
            "total_actual": total_actual,
            "completion": round(completion, 2)
        },
        "shift": shift_data
    }


# ============================
# (OPTIONAL) REMOVE KANBAN LATER
# ============================
@router.get("/kanban")
def get_kanban(date: str, db: Session = Depends(get_db)):

    stage_map = {stage: defaultdict(int) for stage in ALL_STAGES}

    actuals = db.query(DailyActual).filter_by(date=date).all()

    for a in actuals:
        stage_map[a.stage][a.part_number] += a.actual_qty

    return {
        stage: [{"part": p, "qty": q}]
        for stage in ALL_STAGES
        for p, q in stage_map[stage].items()
    }

@router.get("/mt-trend")
def get_mt_trend(db: Session = Depends(get_db)):



    # preload weights
    assembly_data = db.query(Assembly).all()
    weight_map = {a.part_number: a.weight for a in assembly_data}

    actuals = db.query(DailyActual).all()

    date_mt = defaultdict(float)

    for a in actuals:
        if a.stage != "QA":
            continue

        weight = weight_map.get(a.part_number, 0)
        mt = (int(a.actual_qty or 0) * weight) / 1000

        date_mt[str(a.date)] += mt

    result = [
        {"date": d, "mt": round(v, 2)}
        for d, v in sorted(date_mt.items())
    ]

    return result