"""building img and gallery

Revision ID: 8c5bde1b474a
Revises: a8d2b68dfa9d
Create Date: 2026-09-02 14:21:09.442492

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from src.pg_definitions import insert_buildings_history_func


# revision identifiers, used by Alembic.
revision: str = '8c5bde1b474a'
down_revision: Union[str, Sequence[str], None] = 'a8d2b68dfa9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TABLES = ("buildings", "buildings_history", "buildings_temp")


def upgrade() -> None:
    for table in _TABLES:
        op.add_column(table, sa.Column("img", sa.String(), nullable=True))
        op.add_column(
            table, sa.Column("gallery", sa.ARRAY(sa.String()), nullable=True)
        )
    op.replace_entity(insert_buildings_history_func)


def downgrade() -> None:
    for table in _TABLES:
        op.drop_column(table, "gallery")
        op.drop_column(table, "img")
