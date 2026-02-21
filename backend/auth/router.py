from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user
from .models import AppUser
from .schemas import LoginRequest, RefreshRequest, TokenResponse, UserResponse
from .service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_user_by_id,
    is_token_revoked,
    revoke_token,
)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, request.username, request.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(
            request.refresh_token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if await is_token_revoked(db, request.refresh_token):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    user = await get_user_by_id(db, int(user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Revoke old refresh token and issue new pair
    await revoke_token(db, request.refresh_token)
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/logout")
async def logout(
    request: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    await revoke_token(db, request.refresh_token)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: AppUser = Depends(get_current_user)):
    return current_user
