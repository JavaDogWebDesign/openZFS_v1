"""Share service - business logic for SMB and NFS share management."""

import grp
import logging
import os
import stat

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..utils.command import run_command
from . import smb_manager, nfs_manager

logger = logging.getLogger(__name__)

SMB_GROUP = "smbusers"


async def _ensure_smb_group() -> int:
    """Ensure the smbusers group exists, return its GID."""
    try:
        return grp.getgrnam(SMB_GROUP).gr_gid
    except KeyError:
        await run_command("groupadd", [SMB_GROUP])
        return grp.getgrnam(SMB_GROUP).gr_gid


async def _fix_share_permissions(share: dict) -> None:
    """Set directory permissions and add users to smbusers group."""
    path = share.get("path", "")
    if not path or not os.path.isdir(path):
        return

    try:
        gid = await _ensure_smb_group()

        # Set directory to root:smbusers with setgid + group-writable (2775)
        os.chown(path, 0, gid)
        os.chmod(path, stat.S_IRWXU | stat.S_IRWXG | stat.S_ISGID | stat.S_IROTH | stat.S_IXOTH)

        # Add all valid_users and write_list members to the smbusers group
        all_users = set(share.get("valid_users", []) + share.get("write_list", []))
        for username in all_users:
            if username:
                await run_command("usermod", ["-aG", SMB_GROUP, username])
    except Exception as e:
        logger.warning("Failed to fix share permissions for %s: %s", path, e)


# --- SMB ---

async def list_smb_shares() -> list[dict]:
    try:
        return smb_manager.read_shares()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read SMB shares: {e}")


async def create_smb_share(data: dict) -> dict:
    try:
        smb_manager.add_share(data)
        share = smb_manager.get_share(data["name"]) or data
        await _fix_share_permissions(share)
        return share
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


async def update_smb_share(name: str, updates: dict) -> dict:
    try:
        share = smb_manager.update_share(name, updates)
        await _fix_share_permissions(share)
        return share
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


async def remove_shares_for_paths(paths: set[str]) -> None:
    """Remove all SMB shares and NFS exports whose paths match or are under given paths."""
    from ..database import async_session

    # --- SMB ---
    all_smb = smb_manager.read_shares()
    remaining = []
    removed_smb = []
    for share in all_smb:
        share_path = share.get("path", "")
        if any(share_path == p or share_path.startswith(p + "/") for p in paths):
            removed_smb.append(share["name"])
        else:
            remaining.append(share)

    if removed_smb:
        smb_manager.write_shares(remaining)
        try:
            await smb_manager.reload_samba()
        except Exception as e:
            logger.warning("Failed to reload Samba after removing shares: %s", e)
        logger.info("Removed SMB shares for pool destroy: %s", removed_smb)

    # --- NFS ---
    async with async_session() as db:
        from sqlalchemy import select
        from .models import NFSExport

        result = await db.execute(select(NFSExport))
        all_nfs = list(result.scalars().all())
        removed_nfs = []
        for export in all_nfs:
            if any(export.path == p or export.path.startswith(p + "/") for p in paths):
                removed_nfs.append(export.id)
                await db.delete(export)

        if removed_nfs:
            await db.commit()
            await nfs_manager._sync_exports_file(db)
            try:
                await nfs_manager.reload_nfs()
            except Exception as e:
                logger.warning("Failed to reload NFS after removing exports: %s", e)
            logger.info("Removed NFS exports (IDs %s) for pool destroy", removed_nfs)


async def reload_nfs() -> dict:
    try:
        await nfs_manager.reload_nfs()
        return {"detail": "NFS exports reloaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload NFS: {e}")
