from datetime import datetime

from sqlalchemy import String, Integer, Float, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class ScrubSchedule(Base):
    __tablename__ = "scrub_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pool: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    frequency: Mapped[str] = mapped_column(String, nullable=False, default="weekly")
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    day_of_month: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    hour: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    minute: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_run: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    last_status: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
