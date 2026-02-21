import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .manager import manager
from .tasks import pool_status_broadcaster

router = APIRouter()

_broadcaster_task: asyncio.Task | None = None


@router.websocket("/pool-status")
async def pool_status_ws(websocket: WebSocket):
    global _broadcaster_task

    await manager.connect(websocket)

    # Start broadcaster if not running
    if _broadcaster_task is None or _broadcaster_task.done():
        _broadcaster_task = asyncio.create_task(pool_status_broadcaster())

    try:
        while True:
            # Keep connection alive, handle client messages if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
