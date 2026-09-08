from datetime import date, datetime, time

from pydantic import BaseModel, EmailStr, Field, field_validator
import re


VALID_TIME_SLOTS = [
    "12:00", "12:30", "13:00", "13:30",
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
]

PHONE_PATTERN = re.compile(r"^\+?[\d\s\-().]{7,20}$")


class ReservationCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    reservation_date: date
    reservation_time: str
    guests: int = Field(ge=1, le=12)
    special_requests: str | None = Field(default=None, max_length=1000)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_person_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank or whitespace-only")
        if re.search(r"[\x00-\x1f\x7f]", v):
            raise ValueError("Name cannot contain control characters")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_PATTERN.match(v.strip()):
            raise ValueError("Invalid phone number format")
        return v.strip()

    @field_validator("reservation_time")
    @classmethod
    def validate_time_slot(cls, v: str) -> str:
        if v not in VALID_TIME_SLOTS:
            raise ValueError(f"Time must be one of: {', '.join(VALID_TIME_SLOTS)}")
        return v

    @field_validator("reservation_date")
    @classmethod
    def validate_date_not_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Reservation date cannot be in the past")
        return v


class ReservationUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(pending|confirmed|cancelled)$")
    special_requests: str | None = Field(default=None, max_length=1000)


class ReservationResponse(BaseModel):
    id: int
    reference_code: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    reservation_date: date
    reservation_time: str
    guests: int
    special_requests: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    # Communication-layer truth: whether a reservation confirmation email was
    # actually delivered. The frontend uses this to show an honest confirmation
    # message rather than claiming an email that may not have been sent.
    email_sent: bool = False
    email_reason: str | None = None

    model_config = {"from_attributes": True}


class AvailabilityResponse(BaseModel):
    available: bool
    remaining_capacity: int
    message: str


class PaginatedReservationResponse(BaseModel):
    items: list[ReservationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ReservationStats(BaseModel):
    total: int
    today_count: int
    today_guests: int
    upcoming: int
    pending: int
    confirmed: int
    cancelled: int


class ReservationLookup(BaseModel):
    reference_code: str = Field(min_length=1, max_length=20)
    email: EmailStr

    @field_validator("reference_code")
    @classmethod
    def validate_reference(cls, v: str) -> str:
        return v.strip().upper()
