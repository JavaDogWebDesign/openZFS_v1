from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user
from .schemas import LoginRequest, LoginResponse, UserResponse
from .service import (
    authenticate_user,
    check_rate_limit,
    create_session,
    delete_session,
)

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    if not check_rate_limit(request.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )

    if not await authenticate_user(request.username, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    session_id = await create_session(db, request.username)
    response.set_cookie(
        key=settings.cookie_name,
        value=session_id,
        max_age=settings.session_lifetime,
        path="/api",
        httponly=True,
        samesite="lax",
    )
    return LoginResponse(username=request.username)


@router.post("/logout")
async def logout(
    response: Response,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Session ID is stashed on the user dict by get_current_user
    session_id = current_user.get("_session_id")
    if session_id:
        await delete_session(db, session_id)
    response.delete_cookie(key=settings.cookie_name, path="/api")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
