from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "OpenZFS Manager"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./openzfs.db"

    # JWT
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    # WebSocket
    ws_pool_status_interval: int = 5

    # ZFS executables (absolute paths)
    zpool_cmd: str = "/usr/sbin/zpool"
    zfs_cmd: str = "/usr/sbin/zfs"

    # System commands
    useradd_cmd: str = "/usr/sbin/useradd"
    userdel_cmd: str = "/usr/sbin/userdel"
    usermod_cmd: str = "/usr/sbin/usermod"
    passwd_cmd: str = "/usr/bin/passwd"
    chpasswd_cmd: str = "/usr/sbin/chpasswd"
    smbpasswd_cmd: str = "/usr/bin/smbpasswd"
    getent_cmd: str = "/usr/bin/getent"
    exportfs_cmd: str = "/usr/sbin/exportfs"
    systemctl_cmd: str = "/usr/bin/systemctl"
    lsblk_cmd: str = "/usr/bin/lsblk"

    # Samba
    smb_include_file: str = "/etc/samba/openzfs-shares.conf"

    # NFS
    nfs_exports_dir: str = "/etc/exports.d"
    nfs_exports_file: str = "/etc/exports.d/openzfs.exports"

    # Subprocess
    command_timeout: int = 30

    model_config = {"env_prefix": "OPENZFS_", "env_file": ".env"}


settings = Settings()
