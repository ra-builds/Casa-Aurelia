"""Holiday / blackout closures

Creates the ``closures`` table: one-off dates on which the restaurant is fully
closed and no reservations are accepted. This complements the weekly
``closed_day`` on ``restaurants`` with arbitrary single/blackout dates.

Revision ID: 009_closures
Revises: 008_contact_messages
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009_closures'
down_revision: Union[str, None] = '008_contact_messages'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'closures',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('closure_date', sa.Date(), nullable=False),
        sa.Column('reason', sa.String(200), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('CURRENT_TIMESTAMP'),
        ),
    )
    op.create_index(
        'ix_closures_closure_date',
        'closures',
        ['closure_date'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index('ix_closures_closure_date', table_name='closures')
    op.drop_table('closures')
