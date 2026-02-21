from fastapi import APIRouter, Depends, Query

from ..dependencies import get_current_user
from ..auth.models import AppUser
from .schemas import (
    DatasetCreate,
    DatasetUpdate,
    DatasetResponse,
    SnapshotCreate,
    SnapshotResponse,
    CloneCreate,
)
from . import service

router = APIRouter()


@router.get("", response_model=list[DatasetResponse])
async def list_datasets(
    pool: str | None = Query(None),
    current_user: AppUser = Depends(get_current_user),
):
    return await service.list_datasets(pool)


@router.post("")
async def create_dataset(
    dataset: DatasetCreate,
    current_user: AppUser = Depends(get_current_user),
):
    return await service.create_dataset(dataset.name, dataset.properties)


@router.patch("/{path:path}")
async def update_dataset(
    path: str,
    update: DatasetUpdate,
    current_user: AppUser = Depends(get_current_user),
):
    return await service.update_dataset(path, update.properties)


@router.delete("/{path:path}")
async def destroy_dataset(
    path: str,
    current_user: AppUser = Depends(get_current_user),
):
    await service.destroy_dataset(path)
    return {"detail": f"Dataset {path} destroyed"}


@router.get("/{path:path}/snapshots", response_model=list[SnapshotResponse])
async def list_snapshots(
    path: str,
    current_user: AppUser = Depends(get_current_user),
):
    return await service.list_snapshots(path)


@router.post("/{path:path}/snapshots")
async def create_snapshot(
    path: str,
    snapshot: SnapshotCreate,
    current_user: AppUser = Depends(get_current_user),
):
    return await service.create_snapshot(path, snapshot.name)


@router.delete("/{path:path}/snapshots/{snap}")
async def destroy_snapshot(
    path: str,
    snap: str,
    current_user: AppUser = Depends(get_current_user),
):
    await service.destroy_snapshot(path, snap)
    return {"detail": f"Snapshot {path}@{snap} destroyed"}


@router.post("/{path:path}/snapshots/{snap}/rollback")
async def rollback_snapshot(
    path: str,
    snap: str,
    current_user: AppUser = Depends(get_current_user),
):
    return await service.rollback_snapshot(path, snap)


@router.post("/{path:path}/snapshots/{snap}/clone")
async def clone_snapshot(
    path: str,
    snap: str,
    clone: CloneCreate,
    current_user: AppUser = Depends(get_current_user),
):
    return await service.clone_snapshot(path, snap, clone.target)
