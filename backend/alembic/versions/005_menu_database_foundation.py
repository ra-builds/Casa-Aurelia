"""Menu database foundation: updated_at timestamps and CASCADE deletes

Adds updated_at columns to categories and menu_items, and changes the
menu_items.category_id foreign key to ON DELETE CASCADE.

SQLite compatibility notes:
- SQLite rejects "ALTER TABLE ... ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP"
  because ALTER ADD COLUMN only permits constant defaults. The columns are
  therefore added through batch table recreation, where the default lives in
  the new CREATE TABLE statement (always valid) and Alembic's row-copy step
  backfills every existing row from that default.
- The live foreign key constraint is unnamed and cannot be dropped by name,
  so the foreign key swap also runs through batch recreation using an
  explicit table definition (copy_from).

All existing rows are preserved by the batch row-copy in both directions.
The permanent CURRENT_TIMESTAMP default keeps future rows populated even if
inserted without an explicit updated_at value.

Revision ID: 005_menu_database_foundation
Revises: 004_add_restaurant_model
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_menu_database_foundation'
down_revision: Union[str, None] = '004_add_restaurant_model'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


UPDATED_AT_COLUMN = 'updated_at'
CATEGORY_FK_NAME = 'fk_menu_items_category_id_categories'


def _updated_at_column() -> sa.Column:
    return sa.Column(
        UPDATED_AT_COLUMN,
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP'),
    )


def _categories_table(with_updated_at: bool) -> sa.Table:
    """Explicit categories definition matching the Phase 4 schema."""
    columns = [
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('slug', sa.String(100), unique=True, index=True, nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    ]
    if with_updated_at:
        columns.append(_updated_at_column())
    return sa.Table('categories', sa.MetaData(), *columns)


def _menu_items_table(
    with_updated_at: bool,
    cascade: bool,
) -> sa.Table:
    """Explicit menu_items definition used as the batch recreation source.

    ``cascade`` selects the ON DELETE behavior of category_id's foreign key;
    the constraint always carries an explicit stable name so it can be
    dropped inside batch operations regardless of dialect naming rules.
    """
    columns = [
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column(
            'category_id',
            sa.Integer(),
            sa.ForeignKey(
                'categories.id',
                name=CATEGORY_FK_NAME,
                ondelete='CASCADE' if cascade else None,
            ),
            index=True,
            nullable=False,
        ),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('dietary_info', sa.String(100), nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    ]
    if with_updated_at:
        columns.append(_updated_at_column())
    return sa.Table('menu_items', sa.MetaData(), *columns)


def upgrade() -> None:
    # Step 1: Add updated_at to categories.
    # Batch recreation emits the default in CREATE TABLE, so Alembic's
    # row-copy backfills all existing rows via CURRENT_TIMESTAMP.
    with op.batch_alter_table(
        'categories',
        copy_from=_categories_table(with_updated_at=False),
    ) as batch_op:
        batch_op.add_column(_updated_at_column())
        # Batch recreation does not carry reflected/explicit indexes across,
        # so they are recreated here to preserve the original schema.
        batch_op.create_index('ix_categories_id', ['id'])
        batch_op.create_index('ix_categories_slug', ['slug'], unique=True)

    # Step 2: Add updated_at to menu_items AND switch its foreign key to
    # ON DELETE CASCADE in a single rebuild.
    with op.batch_alter_table(
        'menu_items',
        copy_from=_menu_items_table(with_updated_at=False, cascade=False),
    ) as batch_op:
        batch_op.add_column(_updated_at_column())
        batch_op.drop_constraint(CATEGORY_FK_NAME, type_='foreignkey')
        batch_op.create_foreign_key(
            CATEGORY_FK_NAME,
            'categories',
            ['category_id'],
            ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_index('ix_menu_items_category_id', ['category_id'])
        batch_op.create_index('ix_menu_items_id', ['id'])


def downgrade() -> None:
    # Step 2 reversed: Restore the plain foreign key (NO ACTION) and remove
    # updated_at from menu_items in a single rebuild.
    with op.batch_alter_table(
        'menu_items',
        copy_from=_menu_items_table(with_updated_at=True, cascade=True),
    ) as batch_op:
        batch_op.drop_constraint(CATEGORY_FK_NAME, type_='foreignkey')
        # Batch mode requires named constraints; SQLite applies identical
        # NO ACTION semantics to this named constraint as the original
        # unnamed Phase 4 foreign key.
        batch_op.create_foreign_key(
            CATEGORY_FK_NAME,
            'categories',
            ['category_id'],
            ['id'],
        )
        batch_op.drop_column(UPDATED_AT_COLUMN)
        # Restore the Phase 4 indexes on the rebuilt table.
        batch_op.create_index('ix_menu_items_category_id', ['category_id'])
        batch_op.create_index('ix_menu_items_id', ['id'])

    # Step 1 reversed: Remove updated_at from categories.
    with op.batch_alter_table(
        'categories',
        copy_from=_categories_table(with_updated_at=True),
    ) as batch_op:
        batch_op.drop_column(UPDATED_AT_COLUMN)
        # Restore the Phase 4 indexes on the rebuilt table.
        batch_op.create_index('ix_categories_id', ['id'])
        batch_op.create_index('ix_categories_slug', ['slug'], unique=True)
