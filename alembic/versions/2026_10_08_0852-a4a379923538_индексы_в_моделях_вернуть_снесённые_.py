"""индексы в моделях: вернуть снесённые autogenerate

Ремонтная миграция. Индексы существовали только в рукописных миграциях и не
были объявлены в моделях, поэтому autogenerate каждый раз предлагал их удалить
— и однажды это уехало в миграцию. Теперь они объявлены в src/models.py
(__table_args__), а здесь восстанавливаются идемпотентно: на свежей базе их уже
создали более ранние миграции, поэтому IF NOT EXISTS.

Revision ID: a4a379923538
Revises: a5b7d60f95f9
Create Date: 2026-10-08 08:52:44.862964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4a379923538'
down_revision: Union[str, Sequence[str], None] = 'a5b7d60f95f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE INDEX IF NOT EXISTS ix_comments_new_apart_id ON comments (new_apart_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_plate_watches_user_id ON plate_watches (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_lots_plate ON torgi_lots (plate)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_lots_plate_norm ON torgi_lots (plate_norm)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_lots_plate_region ON torgi_lots (plate_region)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_lots_status_text ON torgi_lots (status_text)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_lots_history_lot_id_version ON torgi_lots_history (lot_id, version)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_objects_object_type_code ON torgi_objects (object_type_code)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_objects_status_text ON torgi_objects (status_text)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_objects_district_name ON torgi_objects (district_name)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_objects_request_end_date ON torgi_objects (request_end_date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_torgi_objects_history_lot_id_version ON torgi_objects_history (lot_id, version)")


def downgrade() -> None:
    """Downgrade schema."""
    # индексы принадлежат более ранним миграциям — здесь их не сносим
    pass
