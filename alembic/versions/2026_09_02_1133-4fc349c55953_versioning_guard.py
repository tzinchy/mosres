"""versioning guard

Revision ID: 4fc349c55953
Revises: e68a81f738f4
Create Date: 2026-09-02 11:33:23.929697

"""
from typing import Sequence, Union

from alembic import op

from src.pg_definitions import (
    insert_buildings_history_func,
    insert_new_apart_history_func,
)

# revision identifiers, used by Alembic.
revision: str = '4fc349c55953'
down_revision: Union[str, Sequence[str], None] = 'e68a81f738f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace history trigger functions with no-op-guarded versions."""
    op.replace_entity(insert_new_apart_history_func)
    op.replace_entity(insert_buildings_history_func)


def downgrade() -> None:
    """Forward-only: the old noisy trigger bodies are not restored."""
    pass
