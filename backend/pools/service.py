"""Pool service - business logic for ZFS pool operations."""

import time
import logging
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..utils.parsers import parse_zpool_list, parse_zpool_status, parse_lsblk
from ..utils.validators import validate_pool_name
from . import zfs_executor
from .models import ScrubSchedule

logger = logging.getLogger(__name__)


async def list_pools() -> list[dict]:
    result = await zfs_executor.zpool_list()
    if not result.success and "no pools available" not in result.stderr.lower():
        raise HTTPException(status_code=500, detail=f"Failed to list pools: {result.stderr}")
    if not result.stdout:
        return []
    return parse_zpool_list(result.stdout)


async def get_pool_detail(name: str) -> dict:
    if not validate_pool_name(name):
        raise HTTPException(status_code=400, detail="Invalid pool name")
    result = await zfs_executor.zpool_status(name)
    if not result.success:
        raise HTTPException(status_code=404, detail=f"Pool not found: {result.stderr}")
    return parse_zpool_status(result.stdout)


async def create_pool(
    name: str,
    vdev_type: str,
    disks: list[str],
    properties: dict[str, str],
    fs_properties: dict[str, str] | None = None,
    force: bool = False,
    mountpoint: str | None = None,
) -> dict:
    result = await zfs_executor.zpool_create(
        name, vdev_type, disks, properties,
        fs_properties=fs_properties,
        force=force,
        mountpoint=mountpoint,
    )
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to create pool: {result.stderr}")
    return await get_pool_detail(name)


async def destroy_pool(name: str) -> None:
    if not validate_pool_name(name):
        raise HTTPException(status_code=400, detail="Invalid pool name")

    # Collect mountpoints for all datasets in this pool, then remove shares/exports
    from ..datasets.service import list_datasets
    from ..shares.service import remove_shares_for_paths

    try:
        datasets = await list_datasets(pool=name)
        pool_paths = {ds["mountpoint"] for ds in datasets if ds.get("mountpoint") and ds["mountpoint"] != "-"}
        # Also include the pool root mount (e.g. /tank3)
        pool_paths.add(f"/{name}")
        if pool_paths:
            await remove_shares_for_paths(pool_paths)
    except Exception as e:
        logger.warning("Failed to clean up shares before destroying pool %s: %s", name, e)

    result = await zfs_executor.zpool_destroy(name)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to destroy pool: {result.stderr}")


async def scrub_pool(name: str) -> dict:
    if not validate_pool_name(name):
        raise HTTPException(status_code=400, detail="Invalid pool name")
    result = await zfs_executor.zpool_scrub(name)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to start scrub: {result.stderr}")
    return {"detail": f"Scrub started on {name}"}


async def cancel_scrub(name: str) -> dict:
    if not validate_pool_name(name):
        raise HTTPException(status_code=400, detail="Invalid pool name")
    result = await zfs_executor.zpool_scrub_cancel(name)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to cancel scrub: {result.stderr}")
    return {"detail": f"Scrub cancelled on {name}"}


async def export_pool(name: str) -> dict:
    if not validate_pool_name(name):
        raise HTTPException(status_code=400, detail="Invalid pool name")
    result = await zfs_executor.zpool_export(name)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to export pool: {result.stderr}")
    return {"detail": f"Pool {name} exported"}


async def import_pool(name: str) -> dict:
    if not validate_pool_name(name):
        raise HTTPException(status_code=400, detail="Invalid pool name")
    result = await zfs_executor.zpool_import(name)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to import pool: {result.stderr}")
    return {"detail": f"Pool {name} imported"}


async def get_disks() -> list[dict]:
    result = await zfs_executor.list_disks()
    if not result.success:
        raise HTTPException(status_code=500, detail=f"Failed to list disks: {result.stderr}")
    return parse_lsblk(result.stdout)


# --- Scrub Scheduling ---

async def list_scrub_schedules(db: AsyncSession) -> list[ScrubSchedule]:
    result = await db.execute(select(ScrubSchedule))
    return list(result.scalars().all())


async def get_scrub_schedule(db: AsyncSession, pool: str) -> ScrubSchedule | None:
    result = await db.execute(select(ScrubSchedule).where(ScrubSchedule.pool == pool))
    return result.scalar_one_or_none()


async def create_scrub_schedule(db: AsyncSession, pool: str, data: dict) -> ScrubSchedule:
    existing = await get_scrub_schedule(db, pool)
    if existing:
        raise HTTPException(status_code=400, detail=f"Schedule already exists for pool {pool}")

    schedule = ScrubSchedule(
        pool=pool,
        frequency=data.get("frequency", "weekly"),
        day_of_week=data.get("day_of_week", 0),
        day_of_month=data.get("day_of_month", 1),
        hour=data.get("hour", 2),
        minute=data.get("minute", 0),
        enabled=True,
        created_at=datetime.utcnow(),
    )
    db.add(schedule)
    await db.flush()
    await db.refresh(schedule)
    return schedule


async def update_scrub_schedule(db: AsyncSession, pool: str, updates: dict) -> ScrubSchedule:
    schedule = await get_scrub_schedule(db, pool)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"No schedule found for pool {pool}")

    for key, value in updates.items():
        if value is not None and hasattr(schedule, key):
            setattr(schedule, key, value)

    await db.flush()
    await db.refresh(schedule)
    return schedule


async def delete_scrub_schedule(db: AsyncSession, pool: str) -> None:
    schedule = await get_scrub_schedule(db, pool)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"No schedule found for pool {pool}")
    await db.delete(schedule)
