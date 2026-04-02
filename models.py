from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from database import Base
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

class Assembly(Base):
    __tablename__ = "assemblies"
    part_number: Mapped[str] = mapped_column(primary_key=True)
    name = Column(String)
    customer = Column(String) 
    weight: Mapped[float] = mapped_column()

class Leaf(Base):
    __tablename__ = "leaf"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    part_number: Mapped[str] = mapped_column()
    position: Mapped[str] = mapped_column()   # 1L, 2L, BPP1
    section: Mapped[str] = mapped_column()
    weight: Mapped[float] = mapped_column()

from sqlalchemy.orm import Mapped, mapped_column

class MonthlyPlan(Base):
    __tablename__ = "monthly_plan"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    part_number: Mapped[str] = mapped_column()
    qty: Mapped[int] = mapped_column()


class WIPStock(Base):
    __tablename__ = "wip_stock"

    id: Mapped[int] = mapped_column(primary_key=True)
    part_number: Mapped[str]
    position: Mapped[str]
    stage: Mapped[str]
    qty: Mapped[int]

class StagePlan(Base):
    __tablename__ = "stage_plan"

    id = Column(Integer, primary_key=True)
    date = Column(String)
    stage = Column(String)
    leaf_id = Column(String)
    planned_qty = Column(Integer)
    actual_qty = Column(Integer, default=0)

class AssemblyPlan(Base):
    __tablename__ = "assembly_plan"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[str]
    shift: Mapped[str]
    part_number: Mapped[str]

    planned_qty: Mapped[int]
    actual_qty: Mapped[int] = mapped_column(default=0)
    priority: Mapped[int] = mapped_column(default=0)

class RMStock(Base):
    __tablename__ = "rm_stock"

    id = Column(Integer, primary_key=True)
    section = Column(String, unique=True)
    available_qty = Column(Integer)

class DailyPlan(Base):
    __tablename__ = "daily_plan"

    id = Column(Integer, primary_key=True)
    date = Column(Date)
    shift = Column(String)
    part_number = Column(String)
    planned_qty = Column(Integer)
    priority = Column(Integer)

    line = Column(String)   # 🔥 ADD THIS

from sqlalchemy.orm import Mapped, mapped_column

class DailyActual(Base):
    __tablename__ = "daily_actual"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)  # ✅ ADD THIS

    date: Mapped[str]
    shift: Mapped[str]
    part_number: Mapped[str]
    stage: Mapped[str]
    actual_qty: Mapped[int]

class LeafRMMap(Base):
    __tablename__ = "leaf_rm_map"

    id = Column(Integer, primary_key=True)
    leaf_id = Column(String)
    section = Column(String)
    weight_per_leaf = Column(Float)


class DayStatus(Base):
    __tablename__ = "day_status"

    date = Column(String, primary_key=True)
    is_closed = Column(Boolean, default=False)

id="customer_critical_model"
class CustomerCritical(Base):
    __tablename__ = "customer_critical"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    part_number = Column(String)
    customer = Column(String)
    quantity = Column(Integer)
    line_stoppage_deadline = Column(String)
    target_time = Column(String)