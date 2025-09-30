from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Any

from jose import JWTError, jwt

from app.config.settings import settings


# ----------------------------
# Password hashing (PBKDF2)
# ----------------------------

def hash_password(password: str, *, iterations: int = 600_000) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random 16-byte salt.

    Stored format: "pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>"
    """

    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${dk.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        algo, iterations_s, salt_hex, hash_hex = stored_hash.split("$")
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iterations_s)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        return secrets.compare_digest(dk, expected)
    except Exception:
        return False


# ----------------------------
# JWT utilities (access tokens)
# ----------------------------

def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> str | None:
    """Verify JWT and return subject (user id as string) or None if invalid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        subject: str | None = payload.get("sub")
        if subject is None:
            return None
        return subject
    except JWTError:
        return None


