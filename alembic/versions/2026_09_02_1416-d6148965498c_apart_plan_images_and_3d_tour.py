"""apart plan images and 3d tour

Revision ID: d6148965498c
Revises: 1e21ba30093e
Create Date: 2026-09-02 14:16:04.835822

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from src.pg_definitions import insert_new_apart_history_func

# revision identifiers, used by Alembic.
revision: str = 'd6148965498c'
down_revision: Union[str, Sequence[str], None] = '1e21ba30093e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ("new_aparts", "new_aparts_history", "new_aparts_temp")
_COLS = ("plan", "plan_s", "tour_3d")


def upgrade() -> None:
    for table in _TABLES:
        for col in _COLS:
            op.add_column(table, sa.Column(col, sa.String(), nullable=True))
    op.replace_entity(insert_new_apart_history_func)


def downgrade() -> None:
    for table in _TABLES:
        for col in _COLS:
            op.drop_column(table, col)
