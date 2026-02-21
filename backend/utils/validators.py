import re

# ZFS pool name: alphanumeric, underscore, hyphen, period. Must start with letter.
POOL_NAME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_.\-]{0,63}$")

# ZFS dataset path: pool/dataset/child - each component follows pool name rules
DATASET_PATH_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_.\-]{0,63}(/[a-zA-Z][a-zA-Z0-9_.\-]{0,63})*$")

# Snapshot name: dataset@snapname
SNAPSHOT_NAME_RE = re.compile(r"^[a-zA-Z0-9_.\-]{1,64}$")

# System username: lowercase, start with letter, allow underscore/hyphen/numbers
USERNAME_RE = re.compile(r"^[a-z_][a-z0-9_\-]{0,31}$")

# Group name: same rules as username
GROUP_NAME_RE = re.compile(r"^[a-z_][a-z0-9_\-]{0,31}$")

# SMB share name: alphanumeric, underscore, hyphen
SHARE_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,63}$")

# Filesystem path: absolute path, no null bytes, no double dots
FS_PATH_RE = re.compile(r"^/[a-zA-Z0-9_.\-/]+$")

# NFS client spec: hostname, IP, CIDR, or wildcard
NFS_CLIENT_RE = re.compile(r"^[a-zA-Z0-9.*_\-/]+$")

# Disk device path
DISK_PATH_RE = re.compile(r"^/dev/[a-zA-Z0-9_/\-]+$")


def validate_pool_name(name: str) -> bool:
    return bool(POOL_NAME_RE.match(name)) and "\x00" not in name


def validate_dataset_path(path: str) -> bool:
    return bool(DATASET_PATH_RE.match(path)) and "\x00" not in path


def validate_snapshot_name(name: str) -> bool:
    return bool(SNAPSHOT_NAME_RE.match(name)) and "\x00" not in name


def validate_username(name: str) -> bool:
    return bool(USERNAME_RE.match(name)) and "\x00" not in name


def validate_group_name(name: str) -> bool:
    return bool(GROUP_NAME_RE.match(name)) and "\x00" not in name


def validate_share_name(name: str) -> bool:
    return bool(SHARE_NAME_RE.match(name)) and "\x00" not in name


def validate_fs_path(path: str) -> bool:
    if "\x00" in path or ".." in path:
        return False
    return bool(FS_PATH_RE.match(path))


def validate_nfs_client(client: str) -> bool:
    return bool(NFS_CLIENT_RE.match(client)) and "\x00" not in client


def validate_disk_path(path: str) -> bool:
    if "\x00" in path or ".." in path:
        return False
    return bool(DISK_PATH_RE.match(path))
