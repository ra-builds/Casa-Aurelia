from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Closure(Base):
    """A single holiday/blackout date on which the restaurant is fully closed.

    Complements the weekly ``closed_day`` on ``Restaurant``: these are one-off
    dates (public holidays, private events, vacations) on which no reservations
    are accepted regardless of the day of the week.
    """

    __tablename__ = "closures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    closure_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
