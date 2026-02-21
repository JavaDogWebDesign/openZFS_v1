"""Background tasks for WebSocket updates."""

import asyncio
import logging

from ..config import settings
from ..pools.zfs_executor import zpool_list
from ..utils.parsers import parse_zpool_list
from .manager import manager

logger = logging.getLogger(__name__)


async def pool_status_broadcaster():
    """Periodically broadcast pool status to all connected WebSocket clients."""
    while True:
        try:
            if manager.active_connections:
                result = await zpool_list()
                if result.success:
                    pools = parse_zpool_list(result.stdout) if result.stdout else []
                else:
                    pools = []
                await manager.broadcast({"type": "pool_status", "pools": pools})
        except Exception as e:
            logger.error("Error in pool status broadcaster: %s", e)
        await asyncio.sleep(settings.ws_pool_status_interval)
