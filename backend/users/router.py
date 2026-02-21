from fastapi import APIRouter, Depends

from ..dependencies import get_current_user
from .schemas import (
    UserCreate,
    PasswordChange,
    GroupUpdate,
    SmbPasswordSet,
    SystemUserResponse,
)
from . import service

router = APIRouter()


@router.get("", response_model=list[SystemUserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    return await service.list_users()


@router.post("")
async def create_user(
    user: UserCreate,
    current_user: dict = Depends(get_current_user),
):
    return await service.create_user(user.username, user.password, user.groups)


@router.delete("/{username}")
async def delete_user(
    username: str,
    current_user: dict = Depends(get_current_user),
):
    await service.delete_user(username)
    return {"detail": f"User {username} deleted"}


@router.patch("/{username}/password")
async def change_password(
    username: str,
    body: PasswordChange,
    current_user: dict = Depends(get_current_user),
):
    return await service.change_password(username, body.password)


@router.patch("/{username}/groups")
async def update_groups(
    username: str,
    body: GroupUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await service.update_groups(username, body.groups)


@router.post("/{username}/smb-password")
async def set_smb_password(
    username: str,
    body: SmbPasswordSet,
    current_user: dict = Depends(get_current_user),
):
    return await service.set_smb_password(username, body.password)
