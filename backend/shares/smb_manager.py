"""SMB share configuration manager.

Manages a separate include file for Samba shares.
The main smb.conf should include this file via:
  include = /etc/samba/openzfs-shares.conf
"""

import os
import tempfile
from pathlib import Path
from typing import Any

from ..config import settings
from ..utils.command import run_command


def _parse_smb_conf(content: str) -> list[dict[str, Any]]:
    """Parse SMB share definitions from the include file."""
    shares: list[dict[str, Any]] = []
    current_share: dict[str, Any] | None = None

    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith(";"):
            continue

        if stripped.startswith("[") and stripped.endswith("]"):
            if current_share is not None:
                shares.append(current_share)
            name = stripped[1:-1]
            current_share = {
                "name": name,
                "path": "",
                "comment": "",
                "browseable": True,
                "read_only": False,
                "guest_ok": False,
                "valid_users": [],
                "write_list": [],
                "create_mask": "",
                "directory_mask": "",
                "force_user": "",
                "force_group": "",
                "inherit_permissions": False,
                "vfs_objects": [],
            }
        elif current_share is not None and "=" in stripped:
            key, _, value = stripped.partition("=")
            key = key.strip().lower().replace(" ", "_")
            value = value.strip()

            if key == "path":
                current_share["path"] = value
            elif key == "comment":
                current_share["comment"] = value
            elif key in ("browseable", "browsable"):
                current_share["browseable"] = value.lower() in ("yes", "true", "1")
            elif key == "read_only":
                current_share["read_only"] = value.lower() in ("yes", "true", "1")
            elif key in ("guest_ok", "guest_okay"):
                current_share["guest_ok"] = value.lower() in ("yes", "true", "1")
            elif key == "valid_users":
                current_share["valid_users"] = [u.strip() for u in value.split(",") if u.strip()]
            elif key == "write_list":
                current_share["write_list"] = [u.strip() for u in value.split(",") if u.strip()]
            elif key == "create_mask":
                current_share["create_mask"] = value
            elif key == "directory_mask":
                current_share["directory_mask"] = value
            elif key == "force_user":
                current_share["force_user"] = value
            elif key == "force_group":
                current_share["force_group"] = value
            elif key == "inherit_permissions":
                current_share["inherit_permissions"] = value.lower() in ("yes", "true", "1")
            elif key == "vfs_objects":
                current_share["vfs_objects"] = [o.strip() for o in value.split() if o.strip()]

    if current_share is not None:
        shares.append(current_share)

    return shares


def _render_smb_conf(shares: list[dict[str, Any]]) -> str:
    """Render SMB share definitions to config format."""
    lines = ["# Managed by OpenZFS Manager - do not edit manually", ""]

    for share in shares:
        lines.append(f"[{share['name']}]")
        lines.append(f"   path = {share['path']}")
        if share.get("comment"):
            lines.append(f"   comment = {share['comment']}")
        lines.append(f"   browseable = {'yes' if share.get('browseable', True) else 'no'}")
        lines.append(f"   read only = {'yes' if share.get('read_only', False) else 'no'}")
        lines.append(f"   guest ok = {'yes' if share.get('guest_ok', False) else 'no'}")
        if share.get("valid_users"):
            lines.append(f"   valid users = {', '.join(share['valid_users'])}")
        if share.get("write_list"):
            lines.append(f"   write list = {', '.join(share['write_list'])}")
        if share.get("create_mask"):
            lines.append(f"   create mask = {share['create_mask']}")
        if share.get("directory_mask"):
            lines.append(f"   directory mask = {share['directory_mask']}")
        if share.get("force_user"):
            lines.append(f"   force user = {share['force_user']}")
        if share.get("force_group"):
            lines.append(f"   force group = {share['force_group']}")
        if share.get("inherit_permissions"):
            lines.append("   inherit permissions = yes")
        if share.get("vfs_objects"):
            lines.append(f"   vfs objects = {' '.join(share['vfs_objects'])}")
        lines.append("")

    return "\n".join(lines)


def read_shares() -> list[dict[str, Any]]:
    """Read current SMB shares from the include file."""
    conf_path = settings.smb_include_file
    if not os.path.exists(conf_path):
        return []
    with open(conf_path, "r") as f:
        return _parse_smb_conf(f.read())


def write_shares(shares: list[dict[str, Any]]) -> None:
    """Atomically write SMB shares to the include file."""
    conf_path = settings.smb_include_file
    content = _render_smb_conf(shares)

    # Atomic write: write to temp file then rename
    dir_path = os.path.dirname(conf_path)
    fd, tmp_path = tempfile.mkstemp(dir=dir_path, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(content)
        os.rename(tmp_path, conf_path)
    except Exception:
        os.unlink(tmp_path)
        raise


def get_share(name: str) -> dict[str, Any] | None:
    """Get a specific share by name."""
    shares = read_shares()
    for share in shares:
        if share["name"] == name:
            return share
    return None


def add_share(share: dict[str, Any]) -> None:
    """Add a new SMB share."""
    shares = read_shares()
    for s in shares:
        if s["name"] == share["name"]:
            raise ValueError(f"Share already exists: {share['name']}")
    shares.append(share)
    write_shares(shares)


def update_share(name: str, updates: dict[str, Any]) -> dict[str, Any]:
    """Update an existing SMB share."""
    shares = read_shares()
    for i, s in enumerate(shares):
        if s["name"] == name:
            for key, value in updates.items():
                if value is not None:
                    shares[i][key] = value
            write_shares(shares)
            return shares[i]
    raise ValueError(f"Share not found: {name}")


def remove_share(name: str) -> None:
    """Remove an SMB share."""
    shares = read_shares()
    new_shares = [s for s in shares if s["name"] != name]
    if len(new_shares) == len(shares):
        raise ValueError(f"Share not found: {name}")
    write_shares(new_shares)


async def reload_samba() -> None:
    """Reload Samba configuration."""
    await run_command("systemctl", ["reload", "smbd"])
