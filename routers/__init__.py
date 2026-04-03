from .planning import router as planning_router
from .execution import router as execution_router
from .dashboard import router as dashboard_router
from .upload import router as upload_router
from .live import router as live_router
from .auth import router as auth_router

all_routers = [
    (auth_router, "/auth"),
    (planning_router, "/planning"),
    (execution_router, "/execution"),
    (dashboard_router, "/dashboard"),
    (upload_router, "/upload"),
    (live_router, "/live"),
    
]