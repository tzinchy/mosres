"""разобранный номер лота, паттерны номеров и избранное по лотам

Revision ID: c4e8a7b36d91
Revises: b7f1c92d4a10
Create Date: 2026-10-07 12:00:00.000000

Первый прогон торгов после миграции поднимет версию у всех лотов один раз:
plate_norm / plate_region / plate_valid попадают в сравниваемые колонки
триггера истории, а в базе они пока пустые. Это ожидаемо, не баг.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from src.pg_definitions import (
    TORGI_COMPARED_COLUMNS,
    insert_torgi_lots_history_func,
    torgi_history_func,
)

# revision identifiers, used by Alembic.
revision: str = "c4e8a7b36d91"
down_revision: Union[str, None] = "b7f1c92d4a10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TABLES = ("torgi_lots", "torgi_lots_history", "torgi_lots_temp")
_PLATE_COLUMNS = ("plate_norm", "plate_region", "plate_valid")


def upgrade() -> None:
    for table in _TABLES:
        op.add_column(table, sa.Column("plate_norm", sa.String(), nullable=True))
        op.add_column(table, sa.Column("plate_region", sa.String(), nullable=True))
        op.add_column(
            table,
            sa.Column(
                "plate_valid",
                sa.Boolean(),
                server_default=sa.false(),
                nullable=False,
            ),
        )

    op.create_table(
        "plate_watches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("mask", sa.Text(), nullable=True),
        sa.Column("regex", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_plate_watches_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_plate_watches")),
        sa.UniqueConstraint("user_id", "regex", name=op.f("uq_plate_watches_user_id")),
    )
    op.create_table(
        "torgi_favorites",
        sa.Column("lot_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"],
            ["torgi_lots.lot_id"],
            name=op.f("fk_torgi_favorites_lot_id_torgi_lots"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_torgi_favorites_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("lot_id", "user_id", name=op.f("pk_torgi_favorites")),
    )

    op.create_index("ix_plate_watches_user_id", "plate_watches", ["user_id"])
    op.create_index("ix_torgi_lots_plate_norm", "torgi_lots", ["plate_norm"])
    op.create_index("ix_torgi_lots_plate_region", "torgi_lots", ["plate_region"])

    op.replace_entity(insert_torgi_lots_history_func)


def downgrade() -> None:
    previous = tuple(c for c in TORGI_COMPARED_COLUMNS if c not in _PLATE_COLUMNS)
    op.replace_entity(torgi_history_func(previous))

    op.drop_index("ix_torgi_lots_plate_region", "torgi_lots")
    op.drop_index("ix_torgi_lots_plate_norm", "torgi_lots")
    op.drop_index("ix_plate_watches_user_id", "plate_watches")

    op.drop_table("torgi_favorites")
    op.drop_table("plate_watches")

    for table in _TABLES:
        for column in _PLATE_COLUMNS:
            op.drop_column(table, column)
