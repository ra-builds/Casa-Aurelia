"""Initial schema - create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-08-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('email', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Create categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('slug', sa.String(100), unique=True, index=True, nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Create menu_items table
    op.create_table(
        'menu_items',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), index=True, nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('dietary_info', sa.String(100), nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Create reservations table
    op.create_table(
        'reservations',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('reference_code', sa.String(20), unique=True, nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), index=True, nullable=False),
        sa.Column('phone', sa.String(30), nullable=False),
        sa.Column('reservation_date', sa.Date(), index=True, nullable=False),
        sa.Column('reservation_time', sa.Time(), nullable=False),
        sa.Column('guests', sa.Integer(), nullable=False),
        sa.Column('special_requests', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        'ix_reservations_date_time',
        'reservations',
        ['reservation_date', 'reservation_time']
    )
    op.create_index(
        'ix_reservations_status',
        'reservations',
        ['status']
    )
    op.create_index(
        'ix_reservations_reference',
        'reservations',
        ['reference_code'],
        unique=True
    )

    # Create restaurant_settings table
    op.create_table(
        'restaurant_settings',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('key', sa.String(100), unique=True, index=True, nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_index('ix_reservations_reference', table_name='reservations')
    op.drop_index('ix_reservations_status', table_name='reservations')
    op.drop_index('ix_reservations_date_time', table_name='reservations')
    op.drop_table('restaurant_settings')
    op.drop_table('reservations')
    op.drop_table('menu_items')
    op.drop_table('categories')
    op.drop_table('users')
