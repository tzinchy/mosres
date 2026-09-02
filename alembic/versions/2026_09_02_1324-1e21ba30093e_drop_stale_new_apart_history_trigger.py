"""drop stale new_apart_history_trigger

Revision ID: 1e21ba30093e
Revises: 7709d60428ab
Create Date: 2026-09-02 13:24:13.109684

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '1e21ba30093e'
down_revision: Union[str, Sequence[str], None] = '7709d60428ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove a stale duplicate trigger/function that dev and prod DBs may carry
    from the raw src/sql/new_apart_history_trigger.sql having been applied by hand
    before the alembic-utils entities existed. It was created FOR EACH STATEMENT,
    so NEW is NULL and it writes all-NULL rows into new_aparts_history (or aborts
    the insert on the NOT NULL constraint). Fresh databases never had it; the
    IF EXISTS guards make this a no-op there.
    """
    op.execute("DROP TRIGGER IF EXISTS new_apart_history_trigger ON new_aparts")
    op.execute("DROP FUNCTION IF EXISTS insert_new_apart_history()")


def downgrade() -> None:
    """Forward-only: the broken trigger is not recreated."""
    pass
