from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_current_user
from .schemas import (
    SMBShareCreate,
    SMBShareUpdate,
    SMBShareResponse,
    NFSExportCreate,
    NFSExportUpdate,
    NFSExportResponse,
)
from . import service

router = APIRouter()


# --- SMB ---

@router.get("/smb", response_model=list[SMBShareResponse])
async def list_smb_shares(current_user: dict = Depends(get_current_user)):
    return await service.list_smb_shares()


@router.post("/smb", response_model=SMBShareResponse)
async def create_smb_share(
    share: SMBShareCreate,
    current_user: dict = Depends(get_current_user),
):
    return await service.create_smb_share(share.model_dump())


@router.patch("/smb/{name}", response_model=SMBShareResponse)
async def update_smb_share(
    name: str,
    update: SMBShareUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await service.update_smb_share(name, update.model_dump(exclude_none=True))


@router.delete("/smb/{name}")
async def delete_smb_share(
    name: str,
    current_user: dict = Depends(get_current_user),
):
    await service.delete_smb_share(name)
    return {"detail": f"SMB share {name} deleted"}


@router.post("/smb/reload")
async def reload_smb(current_user: dict = Depends(get_current_user)):
    return await service.reload_smb()


@router.get("/smb/user/{username}", response_model=list[SMBShareResponse])
async def get_user_shares(
    username: str,
    current_user: dict = Depends(get_current_user),
):
    return await service.get_user_shares(username)


# --- NFS ---

@router.get("/nfs", response_model=list[NFSExportResponse])
async def list_nfs_exports(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.list_nfs_exports(db)


@router.post("/nfs", response_model=NFSExportResponse)
async def create_nfs_export(
    export: NFSExportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.create_nfs_export(db, export.path, export.client, export.options)


@router.patch("/nfs/{export_id}", response_model=NFSExportResponse)
async def update_nfs_export(
    export_id: int,
    update: NFSExportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.update_nfs_export(db, export_id, update.client, update.options)


@router.delete("/nfs/{export_id}")
async def delete_nfs_export(
    export_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await service.delete_nfs_export(db, export_id)
    return {"detail": f"NFS export {export_id} deleted"}


@router.post("/nfs/reload")
async def reload_nfs(current_user: dict = Depends(get_current_user)):
    return await service.reload_nfs()
