"""Share service - business logic for SMB and NFS share management."""

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from . import smb_manager, nfs_manager


# --- SMB ---

async def list_smb_shares() -> list[dict]:
    try:
        return smb_manager.read_shares()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read SMB shares: {e}")


async def create_smb_share(data: dict) -> dict:
    try:
        smb_manager.add_share(data)
        return smb_manager.get_share(data["name"]) or data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


async def update_smb_share(name: str, updates: dict) -> dict:
    try:
        return smb_manager.update_share(name, updates)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


async def delete_smb_share(name: str) -> None:
    try:
        smb_manager.remove_share(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


async def reload_smb() -> dict:
    try:
        await smb_manager.reload_samba()
        return {"detail": "Samba reloaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload Samba: {e}")


async def get_user_shares(username: str) -> list[dict]:
    """Get shares where user appears in valid_users or write_list."""
    shares = smb_manager.read_shares()
    return [
        s for s in shares
        if username in s.get("valid_users", []) or username in s.get("write_list", [])
    ]


# --- NFS ---

async def list_nfs_exports(db: AsyncSession) -> list[dict]:
    exports = await nfs_manager.list_exports(db)
    return [
        {"id": e.id, "path": e.path, "client": e.client, "options": e.options}
        for e in exports
    ]


async def create_nfs_export(db: AsyncSession, path: str, client: str, options: str) -> dict:
    export = await nfs_manager.create_export(db, path, client, options)
    return {"id": export.id, "path": export.path, "client": export.client, "options": export.options}


async def update_nfs_export(
    db: AsyncSession, export_id: int, client: str | None, options: str | None
) -> dict:
    try:
        export = await nfs_manager.update_export(db, export_id, client, options)
        return {"id": export.id, "path": export.path, "client": export.client, "options": export.options}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


async def delete_nfs_export(db: AsyncSession, export_id: int) -> None:
    try:
        await nfs_manager.delete_export(db, export_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


async def reload_nfs() -> dict:
    try:
        await nfs_manager.reload_nfs()
        return {"detail": "NFS exports reloaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload NFS: {e}")
