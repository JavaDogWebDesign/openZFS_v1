from fastapi import APIRouter, Depends

from ..dependencies import get_current_user
from .schemas import DriveResponse
from . import service

router = APIRouter()


@router.get("", response_model=list[DriveResponse])
async def list_drives(current_user: dict = Depends(get_current_user)):
    return await service.list_drives()
