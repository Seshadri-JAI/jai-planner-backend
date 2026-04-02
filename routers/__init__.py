from .planning import router as planning_router
from .execution import router as execution_router
from .dashboard import router as dashboard_router
from .upload import router as upload_router
from .live import router as live_router

all_routers = [
    (planning_router, "/planning"),
    (execution_router, "/execution"),
    (dashboard_router, "/dashboard"),
    (upload_router, "/upload"),
    (live_router, "/live"),
]