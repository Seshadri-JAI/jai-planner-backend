from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import all_routers

app = FastAPI()

for router, prefix in all_routers:
    app.include_router(router, prefix=prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # we will restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Planning System Running"}

@app.get("/test")
def test():
    return {"msg": "working"}