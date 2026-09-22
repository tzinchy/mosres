"""Управление пользователями из командной строки.

    uv run python -m src.users add <логин> <пароль>
    uv run python -m src.users passwd <логин> <новый пароль>
    uv run python -m src.users list
"""

import asyncio
import sys

from sqlalchemy import text

from src.auth import hash_password
from src.database import Session


async def _add(username: str, password: str) -> None:
    async with Session() as session, session.begin():
        await session.execute(
            text("INSERT INTO users (username, password_hash) VALUES (:n, :h)"),
            {"n": username, "h": hash_password(password)},
        )
    print(f"пользователь {username} создан")


async def _passwd(username: str, password: str) -> None:
    async with Session() as session, session.begin():
        result = await session.execute(
            text("UPDATE users SET password_hash = :h WHERE username = :n"),
            {"n": username, "h": hash_password(password)},
        )
    print("пароль обновлён" if result.rowcount else f"нет пользователя {username}")


async def _list() -> None:
    async with Session() as session:
        rows = await session.execute(
            text("SELECT id, username, created_at FROM users ORDER BY id")
        )
        for row in rows:
            print(f"{row.id}\t{row.username}\t{row.created_at:%Y-%m-%d}")


def main() -> None:
    match sys.argv[1:]:
        case ["add", username, password]:
            asyncio.run(_add(username, password))
        case ["passwd", username, password]:
            asyncio.run(_passwd(username, password))
        case ["list"]:
            asyncio.run(_list())
        case _:
            print(__doc__)
            sys.exit(1)


if __name__ == "__main__":
    main()
