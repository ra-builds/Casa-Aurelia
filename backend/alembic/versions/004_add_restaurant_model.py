"""Add restaurants table and migrate data from restaurant_settings

Revision ID: 004_add_restaurant_model
Revises: 003_add_user_role
Create Date: 2026-08-21

"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_add_restaurant_model'
down_revision: Union[str, None] = '003_add_user_role'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _migrate_settings_to_restaurant() -> None:
    """Read key-value pairs from restaurant_settings and insert into restaurants."""
    conn = op.get_bind()

    # Read existing settings
    result = conn.execute(sa.text("SELECT key, value FROM restaurant_settings"))
    settings = {row.key: row.value for row in result}

    # Map key-value pairs to restaurant columns
    name = settings.get("name", "Casa Aurelia")
    tagline = settings.get("tagline")
    full_address = settings.get("address", "")
    phone = settings.get("phone", "")
    email = settings.get("email", "")
    capacity = int(settings.get("capacity", "40"))
    lunch_hours = settings.get("lunch_hours", "12:00 – 14:00")
    dinner_hours = settings.get("dinner_hours", "19:00 – 22:00")
    closed_day = settings.get("closed_day", "Monday")

    # Parse city and country from full address
    city = "Novara"
    country = "Italy"
    if full_address:
        parts = full_address.split(",")
        if len(parts) >= 2:
            last_part = parts[-1].strip()
            second_last = parts[-2].strip()
            # "Via Roma 42, 28100 Novara, Italy" -> city="Novara", country="Italy"
            if len(parts) >= 3:
                city = parts[-2].strip().split(" ", 1)[-1] if parts[-2].strip().startswith("28") else parts[-2].strip()
                country = parts[-1].strip()
            else:
                city = second_last
                country = last_part

    conn.execute(
        sa.text(
            "INSERT INTO restaurants (name, tagline, address, city, country, phone, email, "
            "currency, lunch_hours, dinner_hours, closed_day, capacity, social_links, logo_url, updated_at) "
            "VALUES (:name, :tagline, :address, :city, :country, :phone, :email, "
            "'EUR', :lunch_hours, :dinner_hours, :closed_day, :capacity, NULL, NULL, :now)"
        ),
        {
            "name": name,
            "tagline": tagline,
            "address": full_address,
            "city": city,
            "country": country,
            "phone": phone,
            "email": email,
            "lunch_hours": lunch_hours,
            "dinner_hours": dinner_hours,
            "closed_day": closed_day,
            "capacity": capacity,
            "now": datetime.now(timezone.utc),
        },
    )


def _migrate_restaurant_to_settings() -> None:
    """Reverse migration: restaurant_settings already retains original data
    (we intentionally keep restaurant_settings during Phase 4 transition).
    This function is a no-op — the downgrade only needs to drop the restaurants table."""
    pass


def upgrade() -> None:
    # Step 1: Create restaurants table
    op.create_table(
        'restaurants',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('tagline', sa.String(500), nullable=True),
        sa.Column('address', sa.String(500), nullable=False),
        sa.Column('city', sa.String(200), nullable=False),
        sa.Column('country', sa.String(200), nullable=False),
        sa.Column('phone', sa.String(50), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='EUR'),
        sa.Column('lunch_hours', sa.String(100), nullable=False),
        sa.Column('dinner_hours', sa.String(100), nullable=False),
        sa.Column('closed_day', sa.String(50), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False, server_default='40'),
        sa.Column('social_links', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Step 2: Migrate existing data from restaurant_settings
    _migrate_settings_to_restaurant()

    # NOTE: restaurant_settings table is intentionally kept for now.
    # It will be removed in a later step after all application code
    # has been migrated to use the restaurants table.


def downgrade() -> None:
    # Reverse migrate: recreate restaurant_settings from restaurants row
    _migrate_restaurant_to_settings()

    # Drop restaurants table
    op.drop_table('restaurants')
