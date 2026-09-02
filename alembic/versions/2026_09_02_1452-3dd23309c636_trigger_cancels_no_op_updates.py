"""trigger cancels no-op updates

Revision ID: 3dd23309c636
Revises: 8c5bde1b474a
Create Date: 2026-09-02 14:52:49.753743

"""
from typing import Sequence, Union

from alembic import op

from src.pg_definitions import (
    insert_buildings_history_func,
    insert_new_apart_history_func,
)


# revision identifiers, used by Alembic.
revision: str = '3dd23309c636'
down_revision: Union[str, Sequence[str], None] = '8c5bde1b474a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.replace_entity(insert_new_apart_history_func)
    op.replace_entity(insert_buildings_history_func)


def downgrade() -> None:
    pass
