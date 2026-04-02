from collections import defaultdict

def apply_carry_forward(plans):

    carry = defaultdict(int)

    for plan in plans:
        remaining = plan["planned_qty"] - plan["actual_qty"]

        if remaining > 0:
            carry[(plan["leaf_id"], plan["stage"])] += remaining

    # Apply carry to next day
    for plan in plans:
        key = (plan["leaf_id"], plan["stage"])
        if key in carry:
            plan["planned_qty"] += carry[key]

    return plans