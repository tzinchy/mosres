"""users table, per-user favorites and comments

Revision ID: a1b2c3d4e5f6
Revises: c0c0274515da
Create Date: 2026-09-21

Существующие избранное и комментарии переносятся на служебного пользователя
`legacy` (войти под ним нельзя — хеш пароля заведомо невалидный), чтобы ничего
не потерять на базе, где данные уже есть.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c0c0274515da"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("username", name=op.f("uq_users_username")),
    )

    for table in ("favorites", "comments"):
        op.add_column(table, sa.Column("user_id", sa.Integer(), nullable=True))

    op.execute(
        """
        INSERT INTO users (username, password_hash)
        SELECT 'legacy', 'disabled'
        WHERE EXISTS (SELECT 1 FROM favorites)
           OR EXISTS (SELECT 1 FROM comments)
        """
    )
    op.execute(
        "UPDATE favorites SET user_id = (SELECT id FROM users WHERE username = 'legacy')"
        " WHERE user_id IS NULL"
    )
    op.execute(
        "UPDATE comments SET user_id = (SELECT id FROM users WHERE username = 'legacy')"
        " WHERE user_id IS NULL"
    )

    for table in ("favorites", "comments"):
        op.alter_column(table, "user_id", nullable=False)
        op.create_foreign_key(
            op.f(f"fk_{table}_user_id_users"),
            table,
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )

    # избранное теперь уникально в паре (квартира, пользователь)
    op.drop_constraint(op.f("pk_favorites"), "favorites", type_="primary")
    op.create_primary_key(
        op.f("pk_favorites"), "favorites", ["new_apart_id", "user_id"]
    )


def downgrade() -> None:
    op.drop_constraint(op.f("pk_favorites"), "favorites", type_="primary")
    op.create_primary_key(op.f("pk_favorites"), "favorites", ["new_apart_id"])
    for table in ("favorites", "comments"):
        op.drop_constraint(op.f(f"fk_{table}_user_id_users"), table, type_="foreignkey")
        op.drop_column(table, "user_id")
    op.drop_table("users")
