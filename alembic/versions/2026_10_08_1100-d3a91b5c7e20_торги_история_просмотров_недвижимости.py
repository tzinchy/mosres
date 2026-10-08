"""торги: история просмотров лотов недвижимости

Портал крутит счётчик просмотров, а триггер истории отбрасывал update, где
изменились только они, — значение в torgi_objects залипало до следующей
«настоящей» правки лота. Теперь такой update проходит без новой версии, а
значение за день складывается в torgi_object_views.

Revision ID: d3a91b5c7e20
Revises: a4a379923538
Create Date: 2026-10-08 11:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from src.pg_definitions import (
    TORGI_OBJECT_COMPARED_COLUMNS,
    insert_torgi_objects_history_func,
    torgi_objects_history_func,
)

# revision identifiers, used by Alembic.
revision: str = "d3a91b5c7e20"
down_revision: Union[str, Sequence[str], None] = "a4a379923538"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "torgi_object_views",
        sa.Column("lot_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("views", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("lot_id", "day"),
    )
    op.replace_entity(insert_torgi_objects_history_func)
    # стартовая точка ряда: что лежит сейчас (может отставать от портала — до
    # этой миграции счётчик обновлялся только вместе с другими правками)
    op.execute(
        "INSERT INTO torgi_object_views (lot_id, day, views) "
        "SELECT lot_id, current_date, portal_views FROM torgi_objects "
        "WHERE portal_views IS NOT NULL"
    )


def downgrade() -> None:
    op.replace_entity(torgi_objects_history_func(TORGI_OBJECT_COMPARED_COLUMNS))
    op.drop_table("torgi_object_views")
