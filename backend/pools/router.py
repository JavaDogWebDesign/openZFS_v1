from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_current_user
from .schemas import (
    PoolCreate,
    PoolResponse,
    PoolDetailResponse,
    PoolPropertiesResponse,
    DiskResponse,
    ScrubScheduleCreate,
    ScrubScheduleUpdate,
    ScrubScheduleResponse,
)
from . import service

router = APIRouter()


@router.get("", response_model=list[PoolResponse])
async def list_pools(current_user: dict = Depends(get_current_user)):
    return await service.list_pools()


@router.get("/disks", response_model=list[DiskResponse])
async def list_disks(current_user: dict = Depends(get_current_user)):
    return await service.get_disks()


@router.get("/schedules/scrub", response_model=list[ScrubScheduleResponse])
async def list_scrub_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.list_scrub_schedules(db)


@router.get("/{name}", response_model=PoolDetailResponse)
async def get_pool(name: str, current_user: dict = Depends(get_current_user)):
    return await service.get_pool_detail(name)


@router.post("", response_model=PoolDetailResponse)
async def create_pool(pool: PoolCreate, current_user: dict = Depends(get_current_user)):
    return await service.create_pool(
        pool.name,
        pool.vdev_type,
        pool.disks,
        pool.properties,
        fs_properties=pool.fs_properties,
        force=pool.force,
        mountpoint=pool.mountpoint,
    )


@router.delete("/{name}")
async def destroy_pool(name: str, current_user: dict = Depends(get_current_user)):
    await service.destroy_pool(name)
    return {"detail": f"Pool {name} destroyed"}


@router.post("/{name}/scrub")
async def scrub_pool(name: str, current_user: dict = Depends(get_current_user)):
    return await service.scrub_pool(name)


@router.delete("/{name}/scrub")
async def cancel_scrub(name: str, current_user: dict = Depends(get_current_user)):
    return await service.cancel_scrub(name)


@router.post("/{name}/export")
async def export_pool(name: str, current_user: dict = Depends(get_current_user)):
    return await service.export_pool(name)


@router.get("/{name}/properties", response_model=PoolPropertiesResponse)
async def get_pool_properties(name: str, current_user: dict = Depends(get_current_user)):
    return await service.get_pool_properties(name)


@router.post("/{name}/trim")
async def trim_pool(name: str, current_user: dict = Depends(get_current_user)):
    return await service.trim_pool(name)


@router.post("/{name}/import")
async def import_pool(name: str, current_user: dict = Depends(get_current_user)):
    return await service.import_pool(name)


# --- Scrub Schedule endpoints ---

@router.post("/{name}/schedule/scrub", response_model=ScrubScheduleResponse)
async def create_scrub_schedule(
    name: str,
    schedule: ScrubScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.create_scrub_schedule(db, name, schedule.model_dump())


@router.patch("/{name}/schedule/scrub", response_model=ScrubScheduleResponse)
async def update_scrub_schedule(
    name: str,
    update: ScrubScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.update_scrub_schedule(db, name, update.model_dump(exclude_none=True))


@router.delete("/{name}/schedule/scrub")
async def delete_scrub_schedule(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await service.delete_scrub_schedule(db, name)
    return {"detail": f"Scrub schedule for {name} deleted"}
