def detect_bottleneck(stage_data):

    bottlenecks = []

    for stage, values in stage_data.items():
        planned = sum([v["planned_qty"] for v in values])
        actual = sum([v["actual_qty"] for v in values])

        if actual < planned * 0.7:
            bottlenecks.append(stage)

    return bottlenecks