def check_alerts(kpi_data):

    alerts = []

    if kpi_data["completion"] < 70:
        alerts.append({
            "type": "delay",
            "message": "Production behind schedule"
        })

    if kpi_data.get("rm_shortage", 0) > 0:
        alerts.append({
            "type": "rm",
            "message": "Raw Material Shortage"
        })

    return alerts