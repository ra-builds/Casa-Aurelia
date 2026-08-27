import json

from pydantic import BaseModel, field_validator


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
