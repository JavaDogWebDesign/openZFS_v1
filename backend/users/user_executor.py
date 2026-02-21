"""System user command executor - wraps useradd/userdel/usermod/etc."""

from ..utils.command import run_command, CommandResult


async def create_user(username: str, password: str, groups: list[str]) -> CommandResult:
    args = ["-m", "-s", "/bin/bash"]
    if groups:
        args.extend(["-G", ",".join(groups)])
    args.append(username)
    result = await run_command("useradd", args)
    if not result.success:
        return result
    # Set password via chpasswd
    pw_result = await run_command("chpasswd", [], stdin_data=f"{username}:{password}")
    return pw_result


async def delete_user(username: str) -> CommandResult:
    return await run_command("userdel", ["-r", username])


async def change_password(username: str, password: str) -> CommandResult:
    return await run_command("chpasswd", [], stdin_data=f"{username}:{password}")


async def set_groups(username: str, groups: list[str]) -> CommandResult:
    return await run_command("usermod", ["-G", ",".join(groups), username])


async def set_smb_password(username: str, password: str) -> CommandResult:
    return await run_command("smbpasswd", ["-a", "-s", username], stdin_data=f"{password}\n{password}\n")


async def list_users() -> CommandResult:
    return await run_command("getent", ["passwd"])


async def get_user_groups(username: str) -> CommandResult:
    return await run_command("getent", ["group"])
