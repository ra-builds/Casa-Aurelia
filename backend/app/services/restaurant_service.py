import json
import logging

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.restaurant import Restaurant
from app.schemas.restaurant import RestaurantUpdate

logger = logging.getLogger(__name__)
settings = get_settings()


def get_restaurant(db: Session) -> Restaurant | None:
    return db.query(Restaurant).first()


def get_or_create_restaurant(db: Session) -> Restaurant:
    restaurant = db.query(Restaurant).first()
    if restaurant is None:
        restaurant = Restaurant(
            name="Casa Aurelia",
            tagline="Modern Italian cuisine in the heart of Novara",
            address="Via Roma 42, 28100 Novara, Italy",
            city="Novara",
            country="Italy",
            phone="+39 0321 123 456",
            email="info@casaaurelia.it",
            currency="EUR",
            lunch_hours="12:00 – 14:00",
            dinner_hours="19:00 – 22:00",
            closed_day="Monday",
            capacity=settings.restaurant_capacity,
        )
        db.add(restaurant)
        db.commit()
        db.refresh(restaurant)
        logger.info("Created default restaurant config")
    return restaurant


def get_capacity(db: Session) -> int:
    restaurant = get_restaurant(db)
    if restaurant:
        return restaurant.capacity
    return settings.restaurant_capacity


def get_social_links(db: Session) -> dict | None:
    restaurant = get_restaurant(db)
    if restaurant and restaurant.social_links:
        try:
            return json.loads(restaurant.social_links)
        except (json.JSONDecodeError, TypeError):
            return None
    return None


def update_restaurant(db: Session, data: RestaurantUpdate) -> Restaurant:
    restaurant = get_or_create_restaurant(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "social_links":
            restaurant.social_links = json.dumps(value) if value is not None else None
        else:
            setattr(restaurant, field, value)
    db.commit()
    db.refresh(restaurant)
    return restaurant
