import json

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

WEEKDAYS = frozenset({
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
})


class SocialLinks(BaseModel):
    instagram: str | None = None
    facebook: str | None = None
    tripadvisor: str | None = None


class RestaurantResponse(BaseModel):
    id: int
    name: str
    tagline: str | None = None
    address: str
    city: str
    country: str
    phone: str
    email: str
    currency: str
    lunch_hours: str
    dinner_hours: str
    closed_day: str
    capacity: int
    social_links: SocialLinks | None = None
    logo_url: str | None = None

    model_config = {"from_attributes": True}

    @field_validator("social_links", mode="before")
    @classmethod
    def parse_social_links(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v


class RestaurantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    tagline: str | None = Field(default=None, max_length=500)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    city: str | None = Field(default=None, min_length=1, max_length=200)
    country: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = None
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    lunch_hours: str | None = Field(default=None, min_length=1, max_length=100)
    dinner_hours: str | None = Field(default=None, min_length=1, max_length=100)
    closed_day: str | None = Field(default=None, min_length=1, max_length=50)
    capacity: int | None = Field(default=None, ge=1)
    social_links: SocialLinks | None = None
    logo_url: str | None = Field(default=None, max_length=500)

    @field_validator("email")
    @classmethod
    def strip_email(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("closed_day")
    @classmethod
    def normalize_closed_day(cls, v):
        if v is None:
            return v
        key = v.strip().lower()
        if key not in WEEKDAYS:
            raise ValueError("closed_day must be one of the seven English weekday names")
        return key.capitalize()

    @model_validator(mode="after")
    def reject_null_required(self):
        required = {
            "name", "address", "city", "country", "phone", "email",
            "currency", "lunch_hours", "dinner_hours", "closed_day", "capacity",
        }
        for field in required:
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self