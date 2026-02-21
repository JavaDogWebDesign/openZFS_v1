"""Parsers for ZFS CLI output."""

from typing import Any


def parse_zpool_list(output: str) -> list[dict[str, Any]]:
    """Parse `zpool list -Hp` output into list of pool dicts."""
    pools = []
    for line in output.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 11:
            pools.append({
                "name": parts[0],
                "size": int(parts[1]) if parts[1] != "-" else 0,
                "allocated": int(parts[2]) if parts[2] != "-" else 0,
                "free": int(parts[3]) if parts[3] != "-" else 0,
                "checkpoint": parts[4],
                "expandsize": parts[5],
                "fragmentation": parts[6].rstrip("%"),
                "capacity": parts[7].rstrip("%"),
                "dedupratio": parts[8],
                "health": parts[9],
                "altroot": parts[10] if len(parts) > 10 else "-",
            })
    return pools


def parse_zpool_status(output: str) -> dict[str, Any]:
    """Parse `zpool status <pool>` output into structured dict."""
    result: dict[str, Any] = {
        "name": "",
        "state": "",
        "status": "",
        "scan": "",
        "config": [],
        "errors": "",
    }

    current_section = ""
    config_lines: list[str] = []

    for line in output.splitlines():
        stripped = line.strip()
        if stripped.startswith("pool:"):
            result["name"] = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("state:"):
            result["state"] = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("status:"):
            result["status"] = stripped.split(":", 1)[1].strip()
            current_section = "status"
        elif stripped.startswith("scan:"):
            result["scan"] = stripped.split(":", 1)[1].strip()
            current_section = "scan"
        elif stripped.startswith("config:"):
            current_section = "config"
        elif stripped.startswith("errors:"):
            result["errors"] = stripped.split(":", 1)[1].strip()
            current_section = "errors"
        elif current_section == "config" and stripped:
            if stripped.startswith("NAME"):
                continue
            config_lines.append(stripped)
        elif current_section == "status" and stripped:
            result["status"] += " " + stripped
        elif current_section == "scan" and stripped:
            result["scan"] += " " + stripped

    result["config"] = _parse_vdev_tree(config_lines)
    return result


def _parse_vdev_tree(lines: list[str]) -> list[dict[str, Any]]:
    """Parse the vdev config section into a tree structure."""
    vdevs: list[dict[str, Any]] = []
    current_vdev: dict[str, Any] | None = None

    for line in lines:
        parts = line.split()
        if not parts:
            continue

        name = parts[0]
        state = parts[1] if len(parts) > 1 else ""
        read_errors = parts[2] if len(parts) > 2 else "0"
        write_errors = parts[3] if len(parts) > 3 else "0"
        checksum_errors = parts[4] if len(parts) > 4 else "0"

        entry = {
            "name": name,
            "state": state,
            "read": read_errors,
            "write": write_errors,
            "checksum": checksum_errors,
        }

        # Detect indentation level for tree structure
        indent = len(line) - len(line.lstrip())
        if indent <= 2:
            # Pool level - skip (already have pool info)
            current_vdev = None
        elif indent <= 4:
            # vdev level (mirror-0, raidz1-0, etc.)
            current_vdev = {**entry, "children": []}
            vdevs.append(current_vdev)
        else:
            # Disk level
            if current_vdev is not None:
                current_vdev["children"].append(entry)
            else:
                # Single disk pool
                vdevs.append({**entry, "children": []})

    return vdevs


def parse_zfs_list(output: str) -> list[dict[str, Any]]:
    """Parse `zfs list -Hp -o name,used,avail,refer,mountpoint,type` output."""
    datasets = []
    for line in output.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 6:
            datasets.append({
                "name": parts[0],
                "used": int(parts[1]) if parts[1] != "-" else 0,
                "available": int(parts[2]) if parts[2] != "-" else 0,
                "referenced": int(parts[3]) if parts[3] != "-" else 0,
                "mountpoint": parts[4],
                "type": parts[5],
            })
    return datasets


def parse_zfs_get(output: str) -> dict[str, str]:
    """Parse `zfs get -Hp all <dataset>` output into property dict."""
    properties: dict[str, str] = {}
    for line in output.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            properties[parts[1]] = parts[2]
    return properties


def parse_snapshot_list(output: str) -> list[dict[str, Any]]:
    """Parse `zfs list -t snapshot -Hp -o name,used,refer,creation`."""
    snapshots = []
    for line in output.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 4:
            full_name = parts[0]
            dataset, snap_name = full_name.rsplit("@", 1) if "@" in full_name else (full_name, "")
            snapshots.append({
                "full_name": full_name,
                "dataset": dataset,
                "name": snap_name,
                "used": int(parts[1]) if parts[1] != "-" else 0,
                "referenced": int(parts[2]) if parts[2] != "-" else 0,
                "creation": parts[3],
            })
    return snapshots


def parse_lsblk(output: str) -> list[dict[str, Any]]:
    """Parse `lsblk -Jb` JSON output for disk info."""
    import json
    try:
        data = json.loads(output)
        disks = []
        for device in data.get("blockdevices", []):
            if device.get("type") == "disk":
                disks.append({
                    "name": device.get("name", ""),
                    "path": f"/dev/{device.get('name', '')}",
                    "size": int(device.get("size", 0)),
                    "model": device.get("model", "").strip() if device.get("model") else "",
                    "serial": device.get("serial", "").strip() if device.get("serial") else "",
                    "partitions": [
                        {
                            "name": child.get("name", ""),
                            "path": f"/dev/{child.get('name', '')}",
                            "size": int(child.get("size", 0)),
                            "mountpoint": child.get("mountpoint", ""),
                            "fstype": child.get("fstype", ""),
                        }
                        for child in device.get("children", [])
                    ],
                    "in_use": bool(device.get("mountpoint") or device.get("children")),
                })
        return disks
    except (json.JSONDecodeError, KeyError):
        return []
