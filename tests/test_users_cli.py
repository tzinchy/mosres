from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.auth import verify_password


async def test_ensure_is_idempotent(engine, db, monkeypatch):
    """`users ensure` — то, что крутит контейнер на каждом старте: первый раз
    заводит пользователя, дальше не трогает его пароль."""
    import src.users

    monkeypatch.setattr(
        src.users, "Session", async_sessionmaker(engine, expire_on_commit=False)
    )

    await src.users._ensure("seeded", "первый")
    await src.users._ensure("seeded", "второй")

    rows = (
        await db.execute(
            text("SELECT password_hash FROM users WHERE username = 'seeded'")
        )
    ).all()
    assert len(rows) == 1
    assert verify_password("первый", rows[0].password_hash)

    await src.users._ensure("seeded", "")  # пустой пароль — не трогаем БД
    await db.execute(text("DELETE FROM users WHERE username = 'seeded'"))
    await db.commit()
