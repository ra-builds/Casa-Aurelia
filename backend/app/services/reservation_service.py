import logging
import secrets
from datetime import date, datetime, time, timezone

from sqlalchemy import func, insert, literal, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.schemas.reservation import ReservationCreate, ReservationLookup, ReservationStats, ReservationUpdate
from app.services import email_service
from app.services import closure_service
from app.services.restaurant_service import get_capacity, get_restaurant

logger = logging.getLogger(__name__)
settings = get_settings()

WEEKDAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


def is_closed_day(reservation_date: date, closed_day: str) -> bool:
    day_index = WEEKDAY_MAP.get(closed_day.strip().lower(), -1)
    return day_index != -1 and reservation_date.weekday() == day_index


def _parse_time(time_str: str) -> time:
    hour, minute = map(int, time_str.split(":"))
    return time(hour, minute)


def _format_time(t: time) -> str:
    return t.strftime("%H:%M")


def generate_reference_code() -> str:
    return f"CASA-{secrets.token_hex(3).upper()}"


# Bounded re-attempts when a freshly generated reference code collides with an
# existing reservation (the reference_code column is UNIQUE). Collisions are
# astronomically rare with 6 hex chars, but without a retry an identical code
# would surface as an unhandled IntegrityError -> 500 instead of recovering.
MAX_REFERENCE_CODE_ATTEMPTS = 3


class AlreadyCancelledError(ValueError):
    """Raised when a customer tries to cancel a reservation already cancelled.

    Subclasses ValueError so existing `except ValueError` handlers still
    work, but the router can distinguish this state conflict from a genuinely
    missing reservation (which stays a 404).
    """


def get_booked_guests(db: Session, reservation_date: date, reservation_time: str) -> int:
    parsed_time = _parse_time(reservation_time)
    result = (
        db.query(func.coalesce(func.sum(Reservation.guests), 0))
        .filter(
            Reservation.reservation_date == reservation_date,
            Reservation.reservation_time == parsed_time,
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        )
        .scalar()
    )
    return int(result or 0)


def check_availability(db: Session, reservation_date: date, reservation_time: str, guests: int) -> dict:
    # A date strictly before server-local today can never be reserved: the
    # create endpoint rejects it (schemas.validate_date_not_past -> 422). Report
    # it as unavailable so the availability contract never contradicts what can
    # actually be booked. Uses the same server-local `date.today()` boundary.
    if reservation_date < date.today():
        return {
            "available": False,
            "remaining_capacity": 0,
            "message": "Reservations cannot be made for a past date.",
        }

    restaurant = get_restaurant(db)
    if restaurant and is_closed_day(reservation_date, restaurant.closed_day):
        return {
            "available": False,
            "remaining_capacity": 0,
            "message": f"Restaurant is closed on {restaurant.closed_day}s.",
        }

    # Holiday / blackout closure: an explicitly configured one-off closed date
    # (see Closure model). Reported as unavailable regardless of the weekday.
    if closure_service.is_closed_date(db, reservation_date):
        return {
            "available": False,
            "remaining_capacity": 0,
            "message": "Restaurant is closed on this date.",
        }

    booked = get_booked_guests(db, reservation_date, reservation_time)
    capacity = get_capacity(db)
    remaining = capacity - booked
    available = guests <= remaining

    if available:
        message = f"{remaining} seats available for this time slot"
    else:
        message = f"Only {max(remaining, 0)} seats remaining. Please choose another time."

    return {
        "available": available,
        "remaining_capacity": max(remaining, 0),
        "message": message,
    }


def _active_guests_subquery(reservation_date: date, reservation_time: time):
    """Scalar subquery for the total active (non-cancelled, non-deleted) guest count."""
    return (
        select(func.coalesce(func.sum(Reservation.guests), 0))
        .where(
            Reservation.reservation_date == literal(reservation_date),
            Reservation.reservation_time == literal(reservation_time),
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        )
        .scalar_subquery()
    )


def _capacity_ok_condition(reservation_date: date, reservation_time: time, guests: int):
    """Boolean condition that the requested guests fit within remaining capacity.

    Reads the restaurant capacity through a correlated scalar subquery so the
    whole capacity check and the row insert are evaluated as one atomic write
    statement under SQLite's single-writer WAL serialization.
    """
    capacity = (
        select(func.coalesce(func.max(Restaurant.capacity), 0))
        .scalar_subquery()
    )
    booked = _active_guests_subquery(reservation_date, reservation_time)
    return guests <= (capacity - booked)


def _duplicate_ok_condition(email: str, reservation_date: date, reservation_time: time):
    """Boolean condition that NO *active* reservation already exists for this
    email + date + time.

    Mirrors `check_duplicate_reservation`: cancelled and soft-deleted rows are
    excluded, so a customer may legitimately book again after cancelling or after
    an admin soft-deletes their earlier reservation. When combined into the single
    INSERT ... SELECT ... WHERE statement, this condition is re-evaluated against
    committed rows at write time, closing the concurrent-duplicate race without a
    unique index / migration and in a way that also holds on PostgreSQL.
    """
    duplicate_exists = (
        select(Reservation.id)
        .where(
            Reservation.email == literal(email),
            Reservation.reservation_date == literal(reservation_date),
            Reservation.reservation_time == literal(reservation_time),
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        )
        .exists()
    )
    return ~duplicate_exists


def create_reservation(db: Session, data: ReservationCreate) -> Reservation:
    restaurant = get_restaurant(db)
    if restaurant and is_closed_day(data.reservation_date, restaurant.closed_day):
        raise ValueError(f"Reservations are not accepted on {restaurant.closed_day}s.")

    if closure_service.is_closed_date(db, data.reservation_date):
        raise ValueError("Reservations are not accepted on this date (restaurant closed).")

    if check_duplicate_reservation(db, data.email, data.reservation_date, data.reservation_time):
        raise ValueError("You already have a reservation for this date and time.")

    parsed_time = _parse_time(data.reservation_time)

    # The reference_code column is UNIQUE. Reference codes are short (6 hex
    # chars), so a freshly generated code can, in principle, collide with an
    # existing reservation. Without recovery a collision surfaces as an
    # unhandled IntegrityError -> 500. We therefore retry a bounded number of
    # times with a fresh code. Regenerating the code only affects this
    # reservation's own identifier: each attempt still runs the same atomic
    # INSERT ... SELECT ... WHERE (capacity_ok AND duplicate_ok) guard, so the
    # capacity and duplicate invariants are preserved unchanged.
    reservation = None
    for _ in range(MAX_REFERENCE_CODE_ATTEMPTS):
        now = datetime.now(timezone.utc)
        reservation = Reservation(
            reference_code=generate_reference_code(),
            first_name=data.first_name.strip(),
            last_name=data.last_name.strip(),
            email=data.email.lower(),
            phone=data.phone,
            reservation_date=data.reservation_date,
            reservation_time=parsed_time,
            guests=data.guests,
            special_requests=data.special_requests,
            status="pending",
        )

        # Genuinely atomic capacity reservation.
        #
        # The Phase 7D implementation used a SAVEPOINT (begin_nested) around an
        # UNLOCKED SELECT-then-INSERT. A SAVEPOINT only guarantees atomic
        # rollback, not isolation from concurrent writers, so two concurrent
        # requests could both read the same "booked" count and both pass the
        # capacity check, oversubscribing the restaurant.
        #
        # Instead we perform a single INSERT ... SELECT ... WHERE (capacity_ok)
        # so that the capacity check and the insertion are ONE write statement.
        # SQLite (WAL) serializes writers: the second concurrent statement only
        # runs after the first commits, at which point its re-read of the active
        # guest sum observes the committed rows, so the WHERE evaluates false
        # and exactly one request succeeds. This requires no schema change and
        # is also portable to PostgreSQL (the same single-statement semantics
        # hold there).
        #
        # Phase 8D: the WHERE clause additionally requires that NO active (non-
        # cancelled, non-deleted) reservation already exists for this email +
        # date + time (_duplicate_ok_condition). Under the same WAL single-
        # writer serialization, two concurrent identical requests serialize; the
        # second re-reads the first's committed row, the duplicate guard fails,
        # and it inserts 0 rows. This closes the concurrent-duplicate race
        # without a unique index / migration, while deliberately not blocking
        # re-bookings after a cancellation or soft-delete.
        capacity_src = select(
            literal(reservation.reference_code).label("reference_code"),
            literal(reservation.first_name).label("first_name"),
            literal(reservation.last_name).label("last_name"),
            literal(reservation.email).label("email"),
            literal(reservation.phone).label("phone"),
            literal(reservation.reservation_date).label("reservation_date"),
            literal(reservation.reservation_time).label("reservation_time"),
            literal(reservation.guests).label("guests"),
            literal(reservation.special_requests).label("special_requests"),
            literal(reservation.status).label("status"),
            literal(now).label("created_at"),
            literal(now).label("updated_at"),
            literal(None).label("deleted_at"),
        ).where(
            _capacity_ok_condition(data.reservation_date, parsed_time, data.guests),
            _duplicate_ok_condition(data.email.lower(), data.reservation_date, parsed_time),
        )

        stmt = insert(Reservation.__table__).from_select(
            [
                Reservation.reference_code,
                Reservation.first_name,
                Reservation.last_name,
                Reservation.email,
                Reservation.phone,
                Reservation.reservation_date,
                Reservation.reservation_time,
                Reservation.guests,
                Reservation.special_requests,
                Reservation.status,
                Reservation.created_at,
                Reservation.updated_at,
                Reservation.deleted_at,
            ],
            capacity_src,
        )

        try:
            result = db.execute(stmt)
            if result.rowcount == 0:
                # The atomic guard rejected the insert (capacity race).
                # Distinguish the reason for a user-safe message, re-checking
                # the committed state.
                if check_duplicate_reservation(db, data.email, data.reservation_date, data.reservation_time):
                    raise ValueError("You already have a reservation for this date and time.")
                booked = get_booked_guests(db, data.reservation_date, data.reservation_time)
                capacity = get_capacity(db)
                raise ValueError(f"Only {max(capacity - booked, 0)} seats remaining. Please choose another time.")

            db.commit()
            break
        except IntegrityError:
            # A reference_code collision: SQLite raises the UNIQUE violation
            # when the conflicting INSERT executes. Roll back so the session is
            # usable, then retry the same atomic insert with a fresh code. All
            # other unique/integrity violations on this insert path are
            # reference_code collisions (capacity/duplicate are enforced by the
            # WHERE clause, not constraints).
            db.rollback()
            reservation = None

    if reservation is None:
        raise RuntimeError(
            f"Could not allocate a unique reservation reference code after "
            f"{MAX_REFERENCE_CODE_ATTEMPTS} attempts. Please try again."
        )

    reservation = (
        db.query(Reservation)
        .filter(Reservation.reference_code == reservation.reference_code)
        .one()
    )

    logger.info(
        "Reservation %s created for %s at %s",
        reservation.reference_code,
        reservation.email,
        _format_time(reservation.reservation_time),
    )

    # Communication-layer (post-roadmap): deliver a real confirmation email to
    # the guest and a notification to the owner. Both are best-effort: a send
    # failure must never roll back or fail the reservation. The outcome is
    # recorded on the object as a transient attribute (not a DB column) so the
    # response can report delivery honestly. The confirmation email goes to the
    # guest; the owner notification relies on the email service's recipients
    # (configured list falling back to the restaurant address).
    _send_reservation_emails(reservation, restaurant)

    return reservation


def _send_reservation_emails(reservation: Reservation, restaurant: Restaurant | None) -> None:
    """Best-effort reservation confirmation + owner notification emails.

    Records both outcomes on the reservation object as transient attributes read
    by ``reservation_to_response``. Never raises.
    """
    restaurant_name = restaurant.name if restaurant else None

    guest_email_result = email_service.send_reservation_confirmation_email(
        to=reservation.email,
        reference_code=reservation.reference_code,
        first_name=reservation.first_name,
        reservation_date=str(reservation.reservation_date),
        reservation_time=_format_time(reservation.reservation_time),
        guests=reservation.guests,
        restaurant_name=restaurant_name or "Casa Aurelia",
    )

    email_service.send_owner_reservation_notification(
        first_name=reservation.first_name,
        last_name=reservation.last_name,
        guest_email=reservation.email,
        reference_code=reservation.reference_code,
        reservation_date=str(reservation.reservation_date),
        reservation_time=_format_time(reservation.reservation_time),
        guests=reservation.guests,
        restaurant_email=restaurant.email if restaurant else None,
    )

    reservation._email_sent = guest_email_result.success
    reservation._email_reason = guest_email_result.reason if not guest_email_result.success else None


def lookup_reservation(db: Session, reference_code: str, email: str) -> Reservation | None:
    normalized_email = email.strip().lower()
    normalized_ref = reference_code.strip().upper()
    return (
        db.query(Reservation)
        .filter(
            Reservation.reference_code == normalized_ref,
            Reservation.email == normalized_email,
            Reservation.deleted_at.is_(None),
        )
        .first()
    )


def customer_cancel_reservation(db: Session, reference_code: str, email: str) -> Reservation:
    reservation = lookup_reservation(db, reference_code, email)
    if not reservation:
        raise ValueError("Reservation not found. Please check your reference code and email.")
    if reservation.status == "cancelled":
        raise AlreadyCancelledError("This reservation has already been cancelled.")
    reservation.status = "cancelled"
    reservation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(reservation)
    return reservation


def check_duplicate_reservation(db: Session, email: str, reservation_date: date, reservation_time: str) -> bool:
    normalized_email = email.strip().lower()
    parsed_time = _parse_time(reservation_time)
    existing = (
        db.query(Reservation)
        .filter(
            Reservation.email == normalized_email,
            Reservation.reservation_date == reservation_date,
            Reservation.reservation_time == parsed_time,
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        )
        .first()
    )
    return existing is not None


def reservation_to_response(reservation: Reservation) -> dict:
    # email_sent/email_reason are only populated transiently on the creation
    # path; listings and lookups default to not-sent (there is no per-request
    # email side-effect to report there).
    return {
        "id": reservation.id,
        "reference_code": reservation.reference_code,
        "first_name": reservation.first_name,
        "last_name": reservation.last_name,
        "email": reservation.email,
        "phone": reservation.phone,
        "reservation_date": reservation.reservation_date,
        "reservation_time": _format_time(reservation.reservation_time),
        "guests": reservation.guests,
        "special_requests": reservation.special_requests,
        "status": reservation.status,
        "created_at": reservation.created_at,
        "updated_at": reservation.updated_at,
        "email_sent": bool(getattr(reservation, "_email_sent", False)),
        "email_reason": getattr(reservation, "_email_reason", None),
    }


def get_reservations(
    db: Session,
    search: str | None = None,
    status: str | None = None,
    date_filter: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Reservation], int]:
    query = db.query(Reservation).filter(Reservation.deleted_at.is_(None)).order_by(
        Reservation.reservation_date.desc(),
        Reservation.reservation_time.desc(),
    )

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(Reservation.first_name).like(term))
            | (func.lower(Reservation.last_name).like(term))
            | (func.lower(Reservation.email).like(term))
            | (func.lower(Reservation.reference_code).like(term))
            | (Reservation.phone.like(term))
        )

    if status:
        query = query.filter(Reservation.status == status)

    if date_filter:
        query = query.filter(Reservation.reservation_date == date_filter)

    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return items, total


def update_reservation(db: Session, reservation: Reservation, data: ReservationUpdate) -> Reservation:
    if data.status is not None:
        # Reactivating a cancelled reservation puts it back into the active,
        # capacity-consuming set. Every other booking path (create, concurrency,
        # availability) enforces the capacity and duplicate invariants; this
        # admin transition originally enforced neither, so cancel -> rebook ->
        # reactivate could both oversubscribe the restaurant AND / or create a
        # second active reservation for the same email+date+time. Enforce both
        # guards here. The cancelled row being reactivated is excluded from both
        # checks (check_duplicate_reservation and get_booked_guests filter
        # status != "cancelled"), so they only account for the OTHER active
        # reservations at this date/time.
        if reservation.status == "cancelled" and data.status in ("pending", "confirmed"):
            if check_duplicate_reservation(
                db,
                reservation.email,
                reservation.reservation_date,
                _format_time(reservation.reservation_time),
            ):
                raise ValueError("You already have a reservation for this date and time.")
            # The cancelled row is excluded from this count, so `booked` is the
            # total of the OTHER active (non-cancelled, non-deleted) guests at
            # this date/time; the reservation's own guests are added on top.
            booked = (
                db.query(func.coalesce(func.sum(Reservation.guests), 0))
                .filter(
                    Reservation.reservation_date == reservation.reservation_date,
                    Reservation.reservation_time == reservation.reservation_time,
                    Reservation.status != "cancelled",
                    Reservation.deleted_at.is_(None),
                )
                .scalar()
                or 0
            )
            capacity = get_capacity(db)
            if reservation.guests > capacity - booked:
                raise ValueError(
                    f"Only {max(capacity - booked, 0)} seats remaining. Please choose another time."
                )
        reservation.status = data.status
    if data.special_requests is not None:
        reservation.special_requests = data.special_requests
    reservation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(reservation)
    return reservation


def soft_delete_reservation(db: Session, reservation: Reservation) -> None:
    reservation.deleted_at = datetime.now(timezone.utc)
    reservation.updated_at = datetime.now(timezone.utc)
    db.commit()


def get_stats(db: Session) -> ReservationStats:
    base_query = db.query(Reservation).filter(Reservation.deleted_at.is_(None))
    today = date.today()
    total = base_query.count()
    # Aggregates are computed in SQL rather than materializing today's rows into
    # Python, so the cost stays constant as reservation volume grows. Semantics
    # are identical to the previous in-memory loop: today_count counts every
    # non-deleted reservation dated today, while today_guests sums only the
    # non-cancelled ones.
    today_guests = (
        db.query(func.coalesce(func.sum(Reservation.guests), 0))
        .filter(
            Reservation.deleted_at.is_(None),
            Reservation.reservation_date == today,
            Reservation.status != "cancelled",
        )
        .scalar()
        or 0
    )
    today_count = base_query.filter(Reservation.reservation_date == today).count()
    upcoming = (
        base_query
        .filter(Reservation.reservation_date >= today, Reservation.status != "cancelled")
        .count()
    )
    pending = base_query.filter(Reservation.status == "pending").count()
    confirmed = base_query.filter(Reservation.status == "confirmed").count()
    cancelled = base_query.filter(Reservation.status == "cancelled").count()

    return ReservationStats(
        total=total,
        today_count=today_count,
        today_guests=today_guests,
        upcoming=upcoming,
        pending=pending,
        confirmed=confirmed,
        cancelled=cancelled,
    )
