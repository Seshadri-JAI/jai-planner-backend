from database import SessionLocal
from models import StagePlan, AssemblyPlan

db = SessionLocal()

# Stage data
data = [
    StagePlan(date="2026-03-25", stage="SPVC", leaf_id=1, planned_qty=100, actual_qty=80),
    StagePlan(date="2026-03-25", stage="BHT", leaf_id=1, planned_qty=100, actual_qty=60),
    StagePlan(date="2026-03-26", stage="SPVC", leaf_id=1, planned_qty=120, actual_qty=100),
    StagePlan(date="2026-03-26", stage="BHT", leaf_id=1, planned_qty=120, actual_qty=90),
]

for d in data:
    db.add(d)

# Assembly data
asm = [
    AssemblyPlan(date="2026-03-25", shift="A", assembly_id=1, planned_qty=50, actual_qty=40),
    AssemblyPlan(date="2026-03-25", shift="B", assembly_id=1, planned_qty=50, actual_qty=45),
]

for a in asm:
    db.add(a)

db.commit()
db.close()

print("Data inserted")