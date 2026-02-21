"""ZFS pool command executor - wraps zpool CLI calls."""

from ..utils.command import run_command, CommandResult


async def zpool_list() -> CommandResult:
    return await run_command("zpool", ["list", "-Hp"])


async def zpool_status(pool_name: str | None = None) -> CommandResult:
    args = ["status"]
    if pool_name:
        args.append(pool_name)
    return await run_command("zpool", args)


async def zpool_create(
    name: str,
    vdev_type: str,
    disks: list[str],
    properties: dict[str, str],
    fs_properties: dict[str, str] | None = None,
    force: bool = False,
    mountpoint: str | None = None,
) -> CommandResult:
    args = ["create"]

    if force:
        args.append("-f")

    for key, value in properties.items():
        args.extend(["-o", f"{key}={value}"])

    if fs_properties:
        for key, value in fs_properties.items():
            args.extend(["-O", f"{key}={value}"])

    if mountpoint:
        args.extend(["-m", mountpoint])

    args.append(name)
    if vdev_type != "stripe":
        args.append(vdev_type)
    args.extend(disks)

    return await run_command("zpool", args)


async def zpool_destroy(name: str) -> CommandResult:
    return await run_command("zpool", ["destroy", "-f", name])


async def zpool_scrub(name: str) -> CommandResult:
    return await run_command("zpool", ["scrub", name])


async def zpool_scrub_cancel(name: str) -> CommandResult:
    return await run_command("zpool", ["scrub", "-s", name])


async def zpool_export(name: str) -> CommandResult:
    return await run_command("zpool", ["export", name])


async def zpool_import(name: str) -> CommandResult:
    return await run_command("zpool", ["import", name])


async def zpool_get(pool_name: str) -> CommandResult:
    return await run_command("zpool", ["get", "all", pool_name, "-Hp"])


async def zpool_trim(pool_name: str) -> CommandResult:
    return await run_command("zpool", ["trim", pool_name])


async def zpool_iostat() -> CommandResult:
    return await run_command("zpool", ["iostat", "-Hp"])


async def list_disks() -> CommandResult:
    return await run_command("lsblk", ["-Jb", "--output", "NAME,SIZE,TYPE,MODEL,SERIAL,MOUNTPOINT,FSTYPE"])
