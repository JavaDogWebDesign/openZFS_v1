from fastapi import APIRouter, Depends

from ..dependencies import get_current_user
from .schemas import PoolCreate, PoolResponse, PoolDetailResponse, DiskResponse
from . import service

router = APIRouter()


@router.get("", response_model=list[PoolResponse])
async def list_pools(current_user: dict = Depends(get_current_user)):
    return await service.list_pools()


@router.get("/disks", response_model=list[DiskResponse])
async def list_disks(current_user: dict = Depends(get_current_user)):
    return await service.get_disks()


@router.get("/{name}", response_model=PoolDetailResponse)
async def get_pool(name: str, current_user: dict = Depends(get_current_user)):
    return await service.get_pool_detail(name)


@router.post("", response_model=PoolDetailResponse)
async def create_pool(pool: PoolCreate, current_user: dict = Depends(get_current_user)):
    return await service.create_pool(pool.name, pool.vdev_type, pool.disks, pool.properties)


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


@router.post("/{name}/import")
async def import_pool(name: str, current_user: dict = Depends(get_current_user)):
    return await service.import_pool(name)
