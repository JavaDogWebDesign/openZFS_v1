"""NFS export configuration manager.

Manages exports in /etc/exports.d/openzfs.exports.
NFS export IDs are tracked in SQLite since exports files have no ID concept.
"""

import os
import tempfile

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..utils.command import run_command
from .models import NFSExport


def _render_exports(exports: list[dict]) -> str:
    """Render NFS exports to exports file format."""
    lines = ["# Managed by OpenZFS Manager - do not edit manually"]
    for exp in exports:
        lines.append(f"{exp['path']} {exp['client']}({exp['options']})")
    lines.append("")
    return "\n".join(lines)


def _write_exports_file(exports: list[dict]) -> None:
    """Atomically write NFS exports file."""
    exports_file = settings.nfs_exports_file
    content = _render_exports(exports)

    dir_path = os.path.dirname(exports_file)
    os.makedirs(dir_path, exist_ok=True)

    fd, tmp_path = tempfile.mkstemp(dir=dir_path, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(content)
        os.rename(tmp_path, exports_file)
    except Exception:
        os.unlink(tmp_path)
        raise


async def _sync_exports_file(db: AsyncSession) -> None:
    """Sync the exports file from database state."""
    result = await db.execute(select(NFSExport))
    exports = result.scalars().all()
    export_dicts = [
        {"path": e.path, "client": e.client, "options": e.options}
        for e in exports
    ]
    _write_exports_file(export_dicts)


async def list_exports(db: AsyncSession) -> list[NFSExport]:
    result = await db.execute(select(NFSExport))
    return list(result.scalars().all())


async def get_export(db: AsyncSession, export_id: int) -> NFSExport | None:
    result = await db.execute(select(NFSExport).where(NFSExport.id == export_id))
    return result.scalar_one_or_none()


async def create_export(db: AsyncSession, path: str, client: str, options: str) -> NFSExport:
    export = NFSExport(path=path, client=client, options=options)
    db.add(export)
    await db.flush()
    await _sync_exports_file(db)
    return export


async def update_export(
    db: AsyncSession, export_id: int, client: str | None, options: str | None
) -> NFSExport:
    export = await get_export(db, export_id)
    if export is None:
        raise ValueError(f"NFS export not found: {export_id}")
    if client is not None:
        export.client = client
    if options is not None:
        export.options = options
    await db.flush()
    await _sync_exports_file(db)
    return export


async def delete_export(db: AsyncSession, export_id: int) -> None:
    export = await get_export(db, export_id)
    if export is None:
        raise ValueError(f"NFS export not found: {export_id}")
    await db.execute(delete(NFSExport).where(NFSExport.id == export_id))
    await db.flush()
    await _sync_exports_file(db)


async def reload_nfs() -> None:
    """Reload NFS exports."""
    await run_command("exportfs", ["-ra"])
