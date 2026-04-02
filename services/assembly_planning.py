def generate_shift_plan(assembly_plan):

    shifts = ["A", "B", "C"]
    shift_plan = []

    for item in assembly_plan:
        per_shift = item["planned_qty"] // 3

        for shift in shifts:
            shift_plan.append({
                "date": item["date"],
                "part_number": item["part_number"],
                "shift": shift,
                "planned_qty": per_shift,
                "priority": item.get("priority", 0)
            })

    return shift_plan