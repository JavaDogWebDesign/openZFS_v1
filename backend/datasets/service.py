"""Dataset service - business logic for ZFS dataset and snapshot operations."""

from fastapi import HTTPException

from ..utils.command import run_command
from ..utils.parsers import parse_zfs_list, parse_zfs_get, parse_snapshot_list
from ..utils.validators import validate_dataset_path, validate_snapshot_name


async def list_datasets(pool: str | None = None) -> list[dict]:
    args = ["list", "-Hp", "-o", "name,used,avail,refer,mountpoint,type"]
    if pool:
        args.extend(["-r", pool])
    result = await run_command("zfs", args)
    if not result.success:
        if "dataset does not exist" in result.stderr:
            return []
        raise HTTPException(status_code=500, detail=f"Failed to list datasets: {result.stderr}")
    if not result.stdout:
        return []
    return parse_zfs_list(result.stdout)


async def create_dataset(name: str, properties: dict[str, str]) -> dict:
    if not validate_dataset_path(name):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    args = ["create"]
    for key, value in properties.items():
        args.extend(["-o", f"{key}={value}"])
    args.append(name)
    result = await run_command("zfs", args)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to create dataset: {result.stderr}")
    return {"name": name, "detail": "Dataset created"}


async def update_dataset(path: str, properties: dict[str, str]) -> dict:
    if not validate_dataset_path(path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    for key, value in properties.items():
        result = await run_command("zfs", ["set", f"{key}={value}", path])
        if not result.success:
            raise HTTPException(
                status_code=400, detail=f"Failed to set {key}={value}: {result.stderr}"
            )
    return {"name": path, "detail": "Properties updated"}


async def destroy_dataset(path: str) -> None:
    if not validate_dataset_path(path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    result = await run_command("zfs", ["destroy", "-r", path])
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to destroy dataset: {result.stderr}")


async def get_dataset_properties(path: str) -> dict[str, str]:
    if not validate_dataset_path(path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    result = await run_command("zfs", ["get", "-Hp", "all", path])
    if not result.success:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {result.stderr}")
    return parse_zfs_get(result.stdout)


async def list_snapshots(dataset_path: str) -> list[dict]:
    if not validate_dataset_path(dataset_path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    result = await run_command(
        "zfs", ["list", "-t", "snapshot", "-Hp", "-o", "name,used,refer,creation", "-r", dataset_path]
    )
    if not result.success:
        if "dataset does not exist" in result.stderr:
            raise HTTPException(status_code=404, detail="Dataset not found")
        raise HTTPException(status_code=500, detail=f"Failed to list snapshots: {result.stderr}")
    if not result.stdout:
        return []
    return parse_snapshot_list(result.stdout)


async def create_snapshot(dataset_path: str, snap_name: str, recursive: bool = False) -> dict:
    if not validate_dataset_path(dataset_path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    if not validate_snapshot_name(snap_name):
        raise HTTPException(status_code=400, detail="Invalid snapshot name")
    full_name = f"{dataset_path}@{snap_name}"
    args = ["snapshot"]
    if recursive:
        args.append("-r")
    args.append(full_name)
    result = await run_command("zfs", args)
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to create snapshot: {result.stderr}")
    return {"full_name": full_name, "detail": "Snapshot created"}


async def destroy_snapshot(dataset_path: str, snap_name: str) -> None:
    if not validate_dataset_path(dataset_path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    if not validate_snapshot_name(snap_name):
        raise HTTPException(status_code=400, detail="Invalid snapshot name")
    full_name = f"{dataset_path}@{snap_name}"
    result = await run_command("zfs", ["destroy", full_name])
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to destroy snapshot: {result.stderr}")


async def rollback_snapshot(dataset_path: str, snap_name: str) -> dict:
    if not validate_dataset_path(dataset_path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    if not validate_snapshot_name(snap_name):
        raise HTTPException(status_code=400, detail="Invalid snapshot name")
    full_name = f"{dataset_path}@{snap_name}"
    result = await run_command("zfs", ["rollback", "-r", full_name])
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to rollback: {result.stderr}")
    return {"detail": f"Rolled back to {full_name}"}


async def list_all_snapshots(dataset: str | None = None) -> list[dict]:
    """List all snapshots across all pools, optionally filtered by dataset."""
    args = ["list", "-t", "snapshot", "-Hp", "-o", "name,used,refer,creation"]
    if dataset:
        if not validate_dataset_path(dataset):
            raise HTTPException(status_code=400, detail="Invalid dataset path")
        args.extend(["-r", dataset])
    result = await run_command("zfs", args)
    if not result.success:
        if "dataset does not exist" in result.stderr:
            return []
        raise HTTPException(status_code=500, detail=f"Failed to list snapshots: {result.stderr}")
    if not result.stdout:
        return []
    return parse_snapshot_list(result.stdout)


async def rename_snapshot(dataset_path: str, snap_name: str, new_name: str) -> dict:
    if not validate_dataset_path(dataset_path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    if not validate_snapshot_name(snap_name):
        raise HTTPException(status_code=400, detail="Invalid snapshot name")
    if not validate_snapshot_name(new_name):
        raise HTTPException(status_code=400, detail="Invalid new snapshot name")
    old_full = f"{dataset_path}@{snap_name}"
    new_full = f"{dataset_path}@{new_name}"
    result = await run_command("zfs", ["rename", old_full, new_full])
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to rename snapshot: {result.stderr}")
    return {"detail": f"Renamed {old_full} to {new_full}"}


async def clone_snapshot(dataset_path: str, snap_name: str, target: str) -> dict:
    if not validate_dataset_path(dataset_path):
        raise HTTPException(status_code=400, detail="Invalid dataset path")
    if not validate_snapshot_name(snap_name):
        raise HTTPException(status_code=400, detail="Invalid snapshot name")
    if not validate_dataset_path(target):
        raise HTTPException(status_code=400, detail="Invalid clone target path")
    full_name = f"{dataset_path}@{snap_name}"
    result = await run_command("zfs", ["clone", full_name, target])
    if not result.success:
        raise HTTPException(status_code=400, detail=f"Failed to clone: {result.stderr}")
    return {"detail": f"Cloned {full_name} to {target}"}
