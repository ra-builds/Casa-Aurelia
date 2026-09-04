from datetime import date

from sqlalchemy.orm import Session

from app.models.closure import Closure


def is_closed_date(db: Session, reservation_date: date) -> bool:
    """True when the given date is a configured holiday/blackout closure."""
    return (
        db.query(Closure.id).filter(Closure.closure_date == reservation_date).first()
        is not None
    )


def get_closure_dates(db: Session) -> set[date]:
    return {c for (c,) in db.query(Closure.closure_date).all()}
