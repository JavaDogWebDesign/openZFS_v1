"""Drive service - SMART health monitoring and disk enumeration."""

import asyncio
import json
import logging
from typing import Any

from fastapi import HTTPException

from ..utils.command import run_command
from ..utils.parsers import parse_lsblk

logger = logging.getLogger(__name__)


async def get_smart_info(device: str) -> dict[str, Any]:
    """Get SMART health info for a single device."""
    result = await run_command(
        "smartctl",
        ["--json=c", "--info", "--health", "--attributes", "--", f"/dev/{device}"],
        timeout=15,
    )

    info: dict[str, Any] = {
        "available": False,
        "healthy": None,
        "temperature": None,
        "power_on_hours": None,
        "model_family": None,
        "rotation_rate": None,
        "model": None,
        "firmware_version": None,
        "form_factor": None,
        "interface_speed": None,
        "serial_number": None,
        "ata_smart_attributes": None,
    }

    try:
        data = json.loads(result.stdout)
    except (json.JSONDecodeError, ValueError):
        return info

    # Check SMART availability from exit status bitmask
    # Bit 1 = device open failed, Bit 0 = cmd line parse error
    smart_status = data.get("smart_support", {})
    if not smart_status.get("available", False):
        return info

    info["available"] = True

    # Health status
    smart_health = data.get("smart_status", {})
    info["healthy"] = smart_health.get("passed", None)

    # Model info
    info["model_family"] = data.get("model_family")
    info["rotation_rate"] = data.get("rotation_rate")
    info["model"] = data.get("model_name")
    info["firmware_version"] = data.get("firmware_version")
    info["serial_number"] = data.get("serial_number")

    form_factor = data.get("form_factor", {})
    if isinstance(form_factor, dict):
        info["form_factor"] = form_factor.get("name")

    iface_speed = data.get("interface_speed", {})
    if isinstance(iface_speed, dict):
        max_speed = iface_speed.get("max", {})
        if isinstance(max_speed, dict):
            info["interface_speed"] = max_speed.get("string")

    # Temperature - try multiple locations
    temp = data.get("temperature", {})
    if temp.get("current") is not None:
        info["temperature"] = temp["current"]

    # Power-on hours - try ATA attributes first
    ata_attrs = data.get("ata_smart_attributes", {}).get("table", [])
    for attr in ata_attrs:
        if attr.get("id") == 9:  # Power_On_Hours
            raw = attr.get("raw", {})
            info["power_on_hours"] = raw.get("value", 0)
            break

    # Fallback: SCSI power_on_time
    if info["power_on_hours"] is None:
        pot = data.get("power_on_time", {})
        if pot.get("hours") is not None:
            info["power_on_hours"] = pot["hours"]

    # Fallback: NVMe
    if info["power_on_hours"] is None:
        nvme_log = data.get("nvme_smart_health_information_log", {})
        if nvme_log.get("power_on_hours") is not None:
            info["power_on_hours"] = nvme_log["power_on_hours"]
        # NVMe temperature
        if info["temperature"] is None and nvme_log.get("temperature") is not None:
            info["temperature"] = nvme_log["temperature"]

    # ATA SMART attributes table
    if ata_attrs:
        info["ata_smart_attributes"] = [
            {
                "id": attr.get("id"),
                "name": attr.get("name"),
                "value": attr.get("value"),
                "worst": attr.get("worst"),
                "thresh": attr.get("thresh"),
                "raw_value": attr.get("raw", {}).get("string", str(attr.get("raw", {}).get("value", ""))),
                "flags": attr.get("flags", {}).get("string", ""),
            }
            for attr in ata_attrs
        ]

    return info


def _determine_drive_type(smart_info: dict[str, Any], device_name: str, rota: bool | None = None) -> str:
    """Determine if drive is HDD, SSD, NVMe, or Unknown using multi-signal approach."""
    # Signal 1: NVMe device name
    if device_name.startswith("nvme"):
        return "NVMe"

    # Signal 2: SMART rotation_rate (most reliable when available)
    rotation = smart_info.get("rotation_rate")
    if rotation is not None:
        return "HDD" if rotation > 0 else "SSD"

    # Signal 3: Model name heuristic
    model = smart_info.get("model") or ""
    model_family = smart_info.get("model_family") or ""
    if "SSD" in model.upper() or "SSD" in model_family.upper():
        return "SSD"

    # Signal 4: ROTA - only trust ROTA=0 (SSD), ignore ROTA=1 (unreliable in passthrough)
    if rota is not None and not rota:
        return "SSD"

    # Default: Unknown when we can't determine reliably
    return "Unknown"


async def _get_pool_membership() -> dict[str, str]:
    """Get mapping of device names to their pool membership."""
    membership: dict[str, str] = {}
    try:
        result = await run_command("zpool", ["status"])
        if not result.success:
            return membership

        current_pool = ""
        for line in result.stdout.splitlines():
            stripped = line.strip()
            if stripped.startswith("pool:"):
                current_pool = stripped.split(":", 1)[1].strip()
            elif current_pool and stripped and not stripped.startswith(("NAME", "state:", "status:", "scan:", "config:", "errors:", "action:")):
                parts = stripped.split()
                if parts:
                    dev_name = parts[0]
                    # Skip vdev types and pool name itself
                    if dev_name not in ("mirror", "raidz1", "raidz2", "raidz3", "spare", "log", "cache", current_pool) and not dev_name.startswith(("mirror-", "raidz")):
                        membership[dev_name] = current_pool
    except Exception as e:
        logger.warning("Failed to get pool membership: %s", e)

    return membership


async def list_drives() -> list[dict[str, Any]]:
    """List all drives with SMART info and pool membership."""
    result = await run_command("lsblk", ["-Jb", "--output", "NAME,SIZE,TYPE,MODEL,SERIAL,MOUNTPOINT,FSTYPE,ROTA"])
    if not result.success:
        raise HTTPException(status_code=500, detail=f"Failed to list disks: {result.stderr}")

    disks = parse_lsblk(result.stdout)
    pool_map = await _get_pool_membership()

    # Gather SMART info for all disks concurrently
    smart_tasks = [get_smart_info(disk["name"]) for disk in disks]
    smart_results = await asyncio.gather(*smart_tasks, return_exceptions=True)

    drives = []
    for disk, smart in zip(disks, smart_results):
        if isinstance(smart, Exception):
            logger.warning("SMART query failed for %s: %s", disk["name"], smart)
            smart = {"available": False, "healthy": None, "temperature": None, "power_on_hours": None, "model_family": None, "rotation_rate": None, "model": None, "firmware_version": None, "form_factor": None, "interface_speed": None, "serial_number": None, "ata_smart_attributes": None}

        drive_type = _determine_drive_type(smart, disk["name"], disk.get("rota"))

        # Check pool membership
        pool_name = pool_map.get(disk["name"])
        # Also check partitions
        if not pool_name:
            for part in disk.get("partitions", []):
                pool_name = pool_map.get(part.get("name", ""))
                if pool_name:
                    break

        drives.append({
            "name": disk["name"],
            "path": disk["path"],
            "size": disk["size"],
            "model": disk["model"],
            "serial": disk["serial"],
            "type": drive_type,
            "partitions": disk["partitions"],
            "in_use": disk["in_use"] or bool(pool_name),
            "pool": pool_name,
            "smart": smart,
        })

    return drives
