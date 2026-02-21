from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from .models import AppUser, RevokedToken

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(data: dict, token_type: str, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "type": token_type})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(user_id: int) -> str:
    return create_token(
        {"sub": str(user_id)},
        "access",
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: int) -> str:
    return create_token(
        {"sub": str(user_id)},
        "refresh",
        timedelta(days=settings.refresh_token_expire_days),
    )


async def authenticate_user(db: AsyncSession, username: str, password: str) -> AppUser | None:
    result = await db.execute(select(AppUser).where(AppUser.username == username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


async def get_user_by_id(db: AsyncSession, user_id: int) -> AppUser | None:
    result = await db.execute(select(AppUser).where(AppUser.id == user_id))
    return result.scalar_one_or_none()


async def revoke_token(db: AsyncSession, token: str) -> None:
    db.add(RevokedToken(token=token))
    await db.flush()


async def is_token_revoked(db: AsyncSession, token: str) -> bool:
    result = await db.execute(select(RevokedToken).where(RevokedToken.token == token))
    return result.scalar_one_or_none() is not None


async def create_default_admin(db: AsyncSession) -> None:
    result = await db.execute(select(AppUser).limit(1))
    if result.scalar_one_or_none() is None:
        admin = AppUser(
            username="admin",
            hashed_password=hash_password("admin"),
            is_admin=True,
            is_active=True,
        )
        db.add(admin)
        await db.flush()
