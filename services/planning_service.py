from collections import defaultdict
from sqlalchemy.orm import Session
from models import MonthlyPlan, Leaf, WIPStock

STAGE_FLOW = [
    "SPVC",
    "Parabolic",
    "BHT",
    "HT",
    "SSP",
    "Paint"
]

def generate_plan(db: Session):

    leaf_req = defaultdict(int)

    # -------------------------
    # STEP 1: Assembly → Leaf (BOM)
    # -------------------------
    plans = db.query(MonthlyPlan).all()
    if not plans:
        return {}

    for plan in plans:
        leaves = db.query(Leaf).filter_by(part_number=plan.part_number).all()

        if not leaves:
            print(f"⚠️ No leaf master for {plan.part_number}")

        for leaf in leaves:
            key = f"{plan.part_number}_{leaf.position}"   # UNIQUE KEY
            leaf_req[key] += plan.qty

    # -------------------------
    # STEP 2: Stage-wise WIP Map
    # -------------------------
    wip_map = defaultdict(lambda: defaultdict(int))

    wip_entries = db.query(WIPStock).all()

    for w in wip_entries:
       key = f"{w.part_number}_{w.position}"
       wip_map[key][w.stage] += w.qty

    # -------------------------
    # STEP 3: Stage-aware deduction
    # -------------------------
    net_leaf_req = {}

    for leaf_id, total_req in leaf_req.items():

        remaining = total_req

        # Traverse stages in reverse (finished → raw)
        for stage in reversed(STAGE_FLOW):

            available_wip = wip_map[leaf_id].get(stage, 0)

            used = min(remaining, available_wip)

            remaining -= used

            if remaining <= 0:
                break

        net_leaf_req[leaf_id] = max(remaining, 0)

    return net_leaf_req

def calculate_rm_requirement(db: Session, net_leaf_req):

    from models import Leaf

    leaf_output = []
    rm_summary = defaultdict(float)

    for leaf_id, qty in net_leaf_req.items():

        part_number, position = leaf_id.split("_")

        leaf = db.query(Leaf).filter_by(
            part_number=part_number,
            position=position
        ).first()

        if not leaf:
            continue

        rm_required = qty * leaf.weight

        leaf_output.append({
            "leaf_id": leaf_id,
            "section": leaf.section,
            "required_qty": qty,
            "rm_required": round(rm_required, 2)
        })

        rm_summary[leaf.section] += rm_required

    rm_table = [
        {
            "section": sec,
            "auto_rm": round(val, 2),
            "adjusted_rm": round(val, 2)
        }
        for sec, val in rm_summary.items()
    ]

    return leaf_output, rm_table

def apply_stage_constraint(stage_plan):

    ordered_stages = ["SPVC", "Parabolic", "BHT", "HT", "SSP", "Paint"]

    constrained = {}

    prev_output = None

    for stage in ordered_stages:

        planned = stage_plan.get(stage, 0)

        if prev_output is None:
            constrained[stage] = planned
        else:
            constrained[stage] = min(planned, prev_output)

        prev_output = constrained[stage]

    return constrained