"""Add role column to users table

Revision ID: 003_add_user_role
Revises: 002_add_soft_delete
Create Date: 2026-08-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_add_user_role'
down_revision: Union[str, None] = '002_add_soft_delete'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('role', sa.String(50), nullable=False, server_default='admin'),
    )


def downgrade() -> None:
    op.drop_column('users', 'role')
