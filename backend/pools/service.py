"""Pool service - business logic for ZFS pool operations."""

from fastapi import HTTPException

from ..utils.parsers import parse_zpool_list, parse_zpool_status, parse_lsblk
from ..utils.validators import validate_pool_name
from . import zfs_executor


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


async def create_pool(name: str, vdev_type: str, disks: list[str], properties: dict[str, str]) -> dict:
    result = await zfs_executor.zpool_create(name, vdev_type, disks, properties)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to create pool: {result.stderr}")
    return await get_pool_detail(name)


async def destroy_pool(name: str) -> None:
    if not validate_pool_name(name):
        raise HTTPException(status_code=400, detail="Invalid pool name")
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
