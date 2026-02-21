from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db

# Mutating HTTP methods that require CSRF protection
_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from .auth.service import get_session

    session_id = request.cookies.get(settings.cookie_name)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user = await get_session(db, session_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

    # CSRF check: mutating requests must include X-Requested-With header
    if request.method in _MUTATING_METHODS:
        if request.headers.get("X-Requested-With") != "XMLHttpRequest":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing CSRF header",
            )

    # Stash session ID so logout can delete it
    user["_session_id"] = session_id
    return user
