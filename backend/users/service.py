"""User service - business logic for system user management."""

from fastapi import HTTPException

from ..utils.validators import validate_username
from . import user_executor


def _parse_passwd_line(line: str) -> dict | None:
    """Parse a /etc/passwd style line."""
    parts = line.split(":")
    if len(parts) < 7:
        return None
    uid = int(parts[2])
    # Only show regular users (UID >= 1000) and not nobody
    if uid < 1000 or uid == 65534:
        return None
    return {
        "username": parts[0],
        "uid": uid,
        "gid": int(parts[3]),
        "home": parts[5],
        "shell": parts[6],
    }


def _parse_groups_for_user(group_output: str, username: str) -> list[str]:
    """Extract groups a user belongs to from getent group output."""
    groups = []
    for line in group_output.splitlines():
        parts = line.split(":")
        if len(parts) >= 4:
            members = parts[3].split(",") if parts[3] else []
            if username in members:
                groups.append(parts[0])
    return groups


async def list_users() -> list[dict]:
    result = await user_executor.list_users()
    if not result.success:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {result.stderr}")

    group_result = await user_executor.get_user_groups("")
    group_output = group_result.stdout if group_result.success else ""

    users = []
    for line in result.stdout.splitlines():
        user = _parse_passwd_line(line)
        if user:
            user["groups"] = _parse_groups_for_user(group_output, user["username"])
            users.append(user)
    return users


async def create_user(username: str, password: str, groups: list[str]) -> dict:
    if not validate_username(username):
        raise HTTPException(status_code=400, detail="Invalid username")
    result = await user_executor.create_user(username, password, groups)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to create user: {result.stderr}")
    return {"username": username, "detail": "User created"}


async def delete_user(username: str) -> None:
    if not validate_username(username):
        raise HTTPException(status_code=400, detail="Invalid username")
    result = await user_executor.delete_user(username)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to delete user: {result.stderr}")


async def change_password(username: str, password: str) -> dict:
    if not validate_username(username):
        raise HTTPException(status_code=400, detail="Invalid username")
    result = await user_executor.change_password(username, password)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to change password: {result.stderr}")
    return {"detail": "Password changed"}


async def update_groups(username: str, groups: list[str]) -> dict:
    if not validate_username(username):
        raise HTTPException(status_code=400, detail="Invalid username")
    result = await user_executor.set_groups(username, groups)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to update groups: {result.stderr}")
    return {"detail": "Groups updated"}


async def list_groups() -> list[dict]:
    """List all system groups with GID >= 1000 (excluding nobody/65534)."""
    result = await user_executor.get_user_groups("")
    if not result.success:
        raise HTTPException(status_code=500, detail=f"Failed to list groups: {result.stderr}")
    groups = []
    for line in result.stdout.splitlines():
        parts = line.split(":")
        if len(parts) >= 4:
            gid = int(parts[2])
            if gid < 1000 or gid == 65534:
                continue
            members = [m for m in parts[3].split(",") if m]
            groups.append({"name": parts[0], "gid": gid, "members": members})
    return groups


async def set_smb_password(username: str, password: str) -> dict:
    if not validate_username(username):
        raise HTTPException(status_code=400, detail="Invalid username")
    result = await user_executor.set_smb_password(username, password)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to set SMB password: {result.stderr}")
    return {"detail": "SMB password set"}
