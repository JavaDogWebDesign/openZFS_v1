"""Background loops that collect pool and system metrics into the database."""

import asyncio
import logging
import platform
import time

from ..config import settings
from ..database import async_session
from ..pools import zfs_executor
from ..utils.parsers import parse_zpool_list
from .models import Metric

logger = logging.getLogger(__name__)

_IS_LINUX = platform.system() == "Linux"

# ── CPU state for delta calculation ──────────────────────────────────────
_prev_cpu: tuple[float, float] | None = None  # (idle, total)


def _read_cpu_percent() -> float | None:
    """Read /proc/stat and return CPU usage % since last call."""
    global _prev_cpu
    try:
        with open("/proc/stat") as f:
            line = f.readline()  # first line: cpu  user nice system idle ...
        parts = line.split()
        values = [float(v) for v in parts[1:]]
        idle = values[3]
        total = sum(values)

        if _prev_cpu is None:
            _prev_cpu = (idle, total)
            return None

        prev_idle, prev_total = _prev_cpu
        _prev_cpu = (idle, total)

        d_idle = idle - prev_idle
        d_total = total - prev_total
        if d_total == 0:
            return 0.0
        return round((1.0 - d_idle / d_total) * 100, 2)
    except Exception:
        return None


def _read_memory_percent() -> float | None:
    """Read /proc/meminfo and return memory usage %."""
    try:
        info: dict[str, int] = {}
        with open("/proc/meminfo") as f:
            for line in f:
                parts = line.split()
                if parts[0] in ("MemTotal:", "MemAvailable:"):
                    info[parts[0].rstrip(":")] = int(parts[1])
                if len(info) == 2:
                    break
        total = info["MemTotal"]
        avail = info["MemAvailable"]
        if total == 0:
            return 0.0
        return round((total - avail) / total * 100, 2)
    except Exception:
        return None


# ── Network state for delta calculation ──────────────────────────────────
_prev_net: dict[str, tuple[int, int]] | None = None  # iface -> (rx, tx)


def _read_net_bytes() -> tuple[int, int] | None:
    """Read /proc/net/dev and return (rx_delta, tx_delta) since last call."""
    global _prev_net
    try:
        current: dict[str, tuple[int, int]] = {}
        with open("/proc/net/dev") as f:
            for line in f:
                if ":" not in line:
                    continue
                iface, data = line.split(":")
                iface = iface.strip()
                if iface == "lo":
                    continue
                parts = data.split()
                rx = int(parts[0])
                tx = int(parts[8])
                current[iface] = (rx, tx)

        if _prev_net is None:
            _prev_net = current
            return None

        total_rx = total_tx = 0
        for iface, (rx, tx) in current.items():
            if iface in _prev_net:
                prev_rx, prev_tx = _prev_net[iface]
                total_rx += max(0, rx - prev_rx)
                total_tx += max(0, tx - prev_tx)
        _prev_net = current
        return (total_rx, total_tx)
    except Exception:
        return None


async def _pool_metrics_loop() -> None:
    """Collect pool metrics at regular intervals."""
    while True:
        await asyncio.sleep(settings.metrics_pool_interval)
        try:
            result = await zfs_executor.zpool_list()
            if result.returncode != 0:
                continue
            pools = parse_zpool_list(result.stdout)
            now = time.time()
            async with async_session() as db:
                for pool in pools:
                    name = pool["name"]
                    rows = [
                        Metric(timestamp=now, metric_name="pool.allocated", metric_value=float(pool["allocated"]), tags=name),
                        Metric(timestamp=now, metric_name="pool.free", metric_value=float(pool["free"]), tags=name),
                    ]
                    # fragmentation / capacity may be '-' on some pools
                    try:
                        rows.append(Metric(timestamp=now, metric_name="pool.fragmentation", metric_value=float(pool["fragmentation"]), tags=name))
                    except (ValueError, TypeError):
                        pass
                    try:
                        rows.append(Metric(timestamp=now, metric_name="pool.capacity", metric_value=float(pool["capacity"]), tags=name))
                    except (ValueError, TypeError):
                        pass
                    try:
                        rows.append(Metric(timestamp=now, metric_name="pool.dedupratio", metric_value=float(pool["dedupratio"].rstrip("x")), tags=name))
                    except (ValueError, TypeError):
                        pass
                    db.add_all(rows)
                await db.commit()
            logger.debug("Collected pool metrics for %d pools", len(pools))
        except Exception as e:
            logger.warning("Pool metrics collection error: %s", e)


async def _system_metrics_loop() -> None:
    """Collect system metrics (CPU, memory, network) at regular intervals."""
    if not _IS_LINUX:
        logger.warning("System metrics collection skipped: only supported on Linux (/proc)")
        return

    while True:
        await asyncio.sleep(settings.metrics_system_interval)
        try:
            now = time.time()
            rows: list[Metric] = []

            cpu = _read_cpu_percent()
            if cpu is not None:
                rows.append(Metric(timestamp=now, metric_name="system.cpu_percent", metric_value=cpu))

            mem = _read_memory_percent()
            if mem is not None:
                rows.append(Metric(timestamp=now, metric_name="system.memory_percent", metric_value=mem))

            net = _read_net_bytes()
            if net is not None:
                rx, tx = net
                rows.append(Metric(timestamp=now, metric_name="system.net_bytes_recv", metric_value=float(rx)))
                rows.append(Metric(timestamp=now, metric_name="system.net_bytes_sent", metric_value=float(tx)))

            if rows:
                async with async_session() as db:
                    db.add_all(rows)
                    await db.commit()
                logger.debug("Collected %d system metric points", len(rows))
        except Exception as e:
            logger.warning("System metrics collection error: %s", e)


async def _purge_loop() -> None:
    """Delete metrics older than retention period."""
    from sqlalchemy import delete

    while True:
        await asyncio.sleep(3600)
        try:
            cutoff = time.time() - settings.metrics_retention_days * 86400
            async with async_session() as db:
                result = await db.execute(
                    delete(Metric).where(Metric.timestamp < cutoff)
                )
                await db.commit()
                if result.rowcount:
                    logger.info("Purged %d old metric rows", result.rowcount)
        except Exception as e:
            logger.warning("Metrics purge error: %s", e)


# Public references for main.py to start
pool_metrics_loop = _pool_metrics_loop
system_metrics_loop = _system_metrics_loop
purge_loop = _purge_loop
