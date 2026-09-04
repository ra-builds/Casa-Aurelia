"""Contact-form messages storage

Creates the ``contact_messages`` table that persists contact-form submissions so
they are genuinely retained and retrievable by an admin (the post-roadmap
communication-layer replacement for the previous mock contact form). Delivery of
the accompanying owner notification email is best-effort; the stored row is the
source of truth and exists regardless of email delivery.

Revision ID: 008_contact_messages
Revises: 007_allergen_system
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_contact_messages'
down_revision: Union[str, None] = '007_allergen_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'contact_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, index=True),
        sa.Column('subject', sa.String(200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('CURRENT_TIMESTAMP'),
        ),
    )
    op.create_index(
        'ix_contact_messages_created_at',
        'contact_messages',
        ['created_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_contact_messages_created_at', table_name='contact_messages')
    op.drop_table('contact_messages')
