"""Full allergen system: controlled catalog and menu-item associations

Creates two tables:

- ``allergens``: the controlled EU-14 allergen catalog. Rows carry a stable
  machine-readable ``code`` (e.g. "MILK") and the canonical English ``name``.
  Customer-facing labels are resolved through i18n translation keys, never
  through this table, so no fabricated translations live in the database.
- ``menu_item_allergens``: many-to-many association between menu items and
  allergens with a composite primary key (duplicate assignments impossible).

Foreign key behavior is deliberate on both sides:
- menu_items deletion cascades association rows (no orphans).
- allergen deletion cascades only its association rows; it can never delete
  menu items.

The catalog rows are inserted here as reference terminology (EU FIC Annex II
categories). Existing menu items receive NO assignments: authoritative
allergen data does not exist in the repository, so every dish stays
allergen-empty until an admin explicitly assigns allergens.

Revision ID: 007_allergen_system
Revises: 006_add_menu_item_image
Create Date: 2026-08-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_allergen_system'
down_revision: Union[str, None] = '006_add_menu_item_image'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ALLERGEN_CATALOG = [
    ("GLUTEN", "Cereals containing gluten"),
    ("CRUSTACEANS", "Crustaceans"),
    ("EGGS", "Eggs"),
    ("FISH", "Fish"),
    ("PEANUTS", "Peanuts"),
    ("SOYBEANS", "Soybeans"),
    ("MILK", "Milk"),
    ("TREE_NUTS", "Tree nuts"),
    ("CELERY", "Celery"),
    ("MUSTARD", "Mustard"),
    ("SESAME", "Sesame"),
    ("SULPHITES", "Sulphur dioxide and sulphites"),
    ("LUPIN", "Lupin"),
    ("MOLLUSCS", "Molluscs"),
]

ITEM_ALLERGEN_FK = 'fk_menu_item_allergens_menu_item_id_menu_items'
ALLERGEN_FK = 'fk_menu_item_allergens_allergen_id_allergens'


def upgrade() -> None:
    allergens_table = op.create_table(
        'allergens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('CURRENT_TIMESTAMP'),
        ),
    )
    op.bulk_insert(allergens_table, [
        {"code": code, "name": name} for code, name in ALLERGEN_CATALOG
    ])

    op.create_table(
        'menu_item_allergens',
        sa.Column(
            'menu_item_id',
            sa.Integer(),
            sa.ForeignKey('menu_items.id', name=ITEM_ALLERGEN_FK, ondelete='CASCADE'),
            primary_key=True,
        ),
        sa.Column(
            'allergen_id',
            sa.Integer(),
            sa.ForeignKey('allergens.id', name=ALLERGEN_FK, ondelete='CASCADE'),
            primary_key=True,
        ),
    )
    op.create_index(
        'ix_menu_item_allergens_allergen_id',
        'menu_item_allergens',
        ['allergen_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_menu_item_allergens_allergen_id', table_name='menu_item_allergens')
    op.drop_table('menu_item_allergens')
    op.drop_table('allergens')
