import asyncio
import logging
import time
import uuid
from collections import defaultdict

import pam
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from .models import Session

logger = logging.getLogger(__name__)

# In-memory rate limiter: username -> list of timestamps
_login_attempts: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_MAX = 5
_RATE_LIMIT_WINDOW = 300  # 5 minutes


def check_rate_limit(username: str) -> bool:
    """Return True if the request is allowed, False if rate-limited."""
    now = time.time()
    attempts = _login_attempts[username]
    # Prune old entries
    _login_attempts[username] = [t for t in attempts if now - t < _RATE_LIMIT_WINDOW]
    if len(_login_attempts[username]) >= _RATE_LIMIT_MAX:
        return False
    _login_attempts[username].append(now)
    return True


async def authenticate_user(username: str, password: str) -> bool:
    """Authenticate against PAM. Returns True on success."""
    p = pam.pam()
    result = await asyncio.to_thread(p.authenticate, username, password)
    if result:
        logger.info("PAM login successful: user '%s'", username)
    else:
        logger.warning("PAM login failed: user '%s' — %s", username, p.reason)
    return result


async def create_session(db: AsyncSession, username: str) -> str:
    """Create a new session row and return the session ID."""
    session_id = str(uuid.uuid4())
    now = time.time()
    row = Session(
        id=session_id,
        username=username,
        created_at=now,
        expires_at=now + settings.session_lifetime,
    )
    db.add(row)
    await db.flush()
    return session_id


async def get_session(db: AsyncSession, session_id: str) -> dict | None:
    """Look up a session. Returns {"username": ...} or None if expired/missing."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    row = result.scalar_one_or_none()
    if row is None:
        return None
    if time.time() > row.expires_at:
        await db.execute(delete(Session).where(Session.id == session_id))
        await db.flush()
        return None
    return {"username": row.username}


async def delete_session(db: AsyncSession, session_id: str) -> None:
    """Delete a session (logout)."""
    await db.execute(delete(Session).where(Session.id == session_id))
    await db.flush()


async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """Delete all expired sessions. Returns the number removed."""
    now = time.time()
    result = await db.execute(delete(Session).where(Session.expires_at < now))
    await db.flush()
    count = result.rowcount
    if count:
        logger.info("Cleaned up %d expired session(s)", count)
    return count
