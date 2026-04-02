from collections import defaultdict

STAGES = ["SPVC", "Parabolic", "BHT", "HT", "SSP", "Paint", "Ready"]

def generate_stage_plan(net_req):
    stage_plan = []

    for leaf_id, qty in net_req.items():
        

        for stage in STAGES:
            stage_plan.append({
                "leaf_id": leaf_id,
                "stage": stage,
                "planned_qty": per_day
            })

    return stage_plan