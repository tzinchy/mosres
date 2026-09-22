from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from src.auth import hash_password, make_token, parse_token, verify_password
from tests.conftest import seed_apart, seed_building


def test_password_hash_roundtrip():
    stored = hash_password("s3cret")
    assert verify_password("s3cret", stored)
    assert not verify_password("s3cre", stored)
    assert not verify_password("s3cret", "мусор")


def test_token_roundtrip_and_tampering():
    token = make_token(7)
    assert parse_token(f"Bearer {token}") == 7
    assert parse_token(token[:-1] + ("a" if token[-1] != "a" else "b")) is None
    assert parse_token("не токен") is None
    assert parse_token(None) is None


async def test_endpoints_require_token(client):
    anon = AsyncClient(transport=client._transport, base_url="http://test")
    assert (await anon.get("/aparts")).status_code == 401
    assert (await anon.get("/favorites")).status_code == 401
    # логин открыт, иначе войти было бы нечем
    assert (await anon.post("/auth/login", json={"username": "x", "password": "y"})).status_code == 401


async def test_login_issues_working_token(client, db):
    bad = await client.post("/auth/login", json={"username": "tester", "password": "nope"})
    assert bad.status_code == 401

    ok = await client.post("/auth/login", json={"username": "tester", "password": "secret"})
    assert ok.status_code == 200
    token = ok.json()["token"]

    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["username"] == "tester"


async def test_favorites_are_per_user(client, db):
    await seed_building(db)
    apart_id = await seed_apart(db)
    await db.commit()

    assert (await client.post(f"/favorites/{apart_id}")).status_code == 200
    assert (await client.get("/favorites")).json() == [apart_id]

    other_id = await db.scalar(
        text(
            "INSERT INTO users (username, password_hash) VALUES ('другой', :h) RETURNING id"
        ),
        {"h": hash_password("secret")},
    )
    await db.commit()

    other = AsyncClient(
        transport=client._transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {make_token(other_id)}"},
    )
    assert (await other.get("/favorites")).json() == []
