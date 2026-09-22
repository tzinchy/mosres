"""Аутентификация: пароли (scrypt) и подписанные токены (HMAC-SHA256).

Без сторонних библиотек — всё из стандартной библиотеки. Токен самодостаточный:
`base64(user_id.expires_at).подпись`, проверяется по SECRET_KEY, отзыв возможен
только сменой ключа (для инструмента на несколько человек этого достаточно).
"""

import base64
import hashlib
import hmac
import secrets
import time
from contextvars import ContextVar

from src.config import settings

_SCRYPT = dict(n=2**14, r=8, p=1, dklen=32)

# id пользователя текущего запроса: ставится в middleware, читается в
# repository, чтобы не тащить его через все сигнатуры сервиса.
_current_user_id: ContextVar[int | None] = ContextVar("current_user_id", default=None)


def set_current_user_id(user_id: int | None) -> None:
    _current_user_id.set(user_id)


def current_user_id() -> int:
    """0 вне запроса (планировщик, скрипты) — такого пользователя нет, поэтому
    запросы с фильтром по избранному просто ничего не вернут."""
    return _current_user_id.get() or 0


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    if algo != "scrypt":
        return False
    digest = hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt_hex), **_SCRYPT
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


def _sign(payload: str) -> str:
    mac = hmac.new(
        settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256
    ).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")


def make_token(user_id: int) -> str:
    payload = f"{user_id}.{int(time.time()) + settings.TOKEN_TTL_HOURS * 3600}"
    return f"{payload}.{_sign(payload)}"


def parse_token(token: str | None) -> int | None:
    """id пользователя, если токен целый и не просрочен, иначе None."""
    if not token:
        return None
    if token.startswith("Bearer "):
        token = token[7:]
    try:
        user_id_raw, expires_raw, signature = token.split(".")
    except ValueError:
        return None
    if not hmac.compare_digest(_sign(f"{user_id_raw}.{expires_raw}"), signature):
        return None
    try:
        if int(expires_raw) < time.time():
            return None
        return int(user_id_raw)
    except ValueError:
        return None
