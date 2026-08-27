"""Menu item image system: add nullable image_url column

Adds ``menu_items.image_url`` (String(500), NULL allowed) which stores the
public URL path of an admin-uploaded dish photo (e.g. "/uploads/menu/<uuid>.jpg").

SQLite compatibility notes:
- Adding a single nullable column without a server default is supported by
  SQLite's native ALTER TABLE, so no batch table recreation is required.
- All existing rows keep image_url = NULL, which the customer-facing menu
  already treats as "render the text-forward layout".

Revision ID: 006_add_menu_item_image
Revises: 005_menu_database_foundation
Create Date: 2026-08-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_add_menu_item_image'
down_revision: Union[str, None] = '005_menu_database_foundation'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'menu_items',
        sa.Column('image_url', sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('menu_items', 'image_url')
