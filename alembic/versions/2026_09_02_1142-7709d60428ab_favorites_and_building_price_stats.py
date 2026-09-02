"""favorites and building_price_stats

Revision ID: 7709d60428ab
Revises: 4fc349c55953
Create Date: 2026-09-02 11:42:38.999509

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7709d60428ab'
down_revision: Union[str, Sequence[str], None] = '4fc349c55953'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "favorites",
        sa.Column("new_apart_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(
            ["new_apart_id"], ["new_aparts.new_apart_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("new_apart_id"),
    )
    op.create_table(
        "building_price_stats",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("building_id", sa.Integer(), nullable=False),
        sa.Column(
            "snapshot_date", sa.Date(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("avg_price_m", sa.Numeric(), nullable=True),
        sa.Column("min_price_m", sa.Numeric(), nullable=True),
        sa.Column("median_price_m", sa.Numeric(), nullable=True),
        sa.Column("apart_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("building_id", "snapshot_date"),
    )


def downgrade() -> None:
    op.drop_table("building_price_stats")
    op.drop_table("favorites")
