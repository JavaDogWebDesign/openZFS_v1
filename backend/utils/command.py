import asyncio
import logging
from dataclasses import dataclass

from ..config import settings

logger = logging.getLogger(__name__)

# Allowlisted executables - only these can be run
ALLOWED_COMMANDS: dict[str, str] = {
    "zpool": settings.zpool_cmd,
    "zfs": settings.zfs_cmd,
    "useradd": settings.useradd_cmd,
    "userdel": settings.userdel_cmd,
    "usermod": settings.usermod_cmd,
    "passwd": settings.passwd_cmd,
    "chpasswd": settings.chpasswd_cmd,
    "smbpasswd": settings.smbpasswd_cmd,
    "getent": settings.getent_cmd,
    "exportfs": settings.exportfs_cmd,
    "systemctl": settings.systemctl_cmd,
    "lsblk": settings.lsblk_cmd,
    "smartctl": settings.smartctl_cmd,
    "groupadd": settings.groupadd_cmd,
}


@dataclass
class CommandResult:
    returncode: int
    stdout: str
    stderr: str

    @property
    def success(self) -> bool:
        return self.returncode == 0


class CommandError(Exception):
    def __init__(self, message: str, result: CommandResult | None = None):
        super().__init__(message)
        self.result = result


def _validate_args(args: list[str]) -> None:
    for arg in args:
        if "\x00" in arg:
            raise CommandError("Null byte detected in command argument")


async def run_command(
    command_name: str,
    args: list[str],
    timeout: int | None = None,
    stdin_data: str | None = None,
) -> CommandResult:
    if command_name not in ALLOWED_COMMANDS:
        raise CommandError(f"Command not allowed: {command_name}")

    executable = ALLOWED_COMMANDS[command_name]
    _validate_args(args)

    cmd = [executable] + args
    timeout = timeout or settings.command_timeout

    logger.info("Executing: %s %s", command_name, " ".join(args))

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            stdin=asyncio.subprocess.PIPE if stdin_data else None,
        )
        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            process.communicate(input=stdin_data.encode() if stdin_data else None),
            timeout=timeout,
        )
        result = CommandResult(
            returncode=process.returncode or 0,
            stdout=stdout_bytes.decode("utf-8", errors="replace").strip(),
            stderr=stderr_bytes.decode("utf-8", errors="replace").strip(),
        )

        if not result.success:
            logger.warning(
                "Command failed: %s %s -> rc=%d stderr=%s",
                command_name,
                " ".join(args),
                result.returncode,
                result.stderr,
            )

        return result

    except asyncio.TimeoutError:
        if process:
            process.kill()
        raise CommandError(f"Command timed out after {timeout}s: {command_name}")
    except FileNotFoundError:
        raise CommandError(f"Executable not found: {executable}")
