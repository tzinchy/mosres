"""comments table

Revision ID: 1ea851e66903
Revises: 3dd23309c636
Create Date: 2026-09-02 15:33:19.174526

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ea851e66903'
down_revision: Union[str, Sequence[str], None] = '3dd23309c636'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("new_apart_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(
            ["new_apart_id"], ["new_aparts.new_apart_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_comments_new_apart_id", "comments", ["new_apart_id"])


def downgrade() -> None:
    op.drop_index("ix_comments_new_apart_id", table_name="comments")
    op.drop_table("comments")
