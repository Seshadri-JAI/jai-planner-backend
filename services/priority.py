def apply_priority(plan_list):

    # Higher priority first
    sorted_plan = sorted(plan_list, key=lambda x: -x["priority"])

    return sorted_plan