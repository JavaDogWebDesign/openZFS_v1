from pydantic import BaseModel, Field, field_validator
from typing import Any

from ..utils.validators import validate_pool_name, validate_disk_path


class PoolCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    vdev_type: str = Field(..., pattern=r"^(stripe|mirror|raidz|raidz2|raidz3)$")
    disks: list[str] = Field(..., min_length=1)
    properties: dict[str, str] = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        if not validate_pool_name(v):
            raise ValueError("Invalid pool name")
        return v

    @field_validator("disks")
    @classmethod
    def check_disks(cls, v: list[str]) -> list[str]:
        for d in v:
            if not validate_disk_path(d):
                raise ValueError(f"Invalid disk path: {d}")
        return v


class PoolResponse(BaseModel):
    name: str
    size: int
    allocated: int
    free: int
    fragmentation: str
    capacity: str
    dedupratio: str
    health: str


class PoolDetailResponse(BaseModel):
    name: str
    state: str
    status: str
    scan: str
    config: list[dict[str, Any]]
    errors: str


class DiskResponse(BaseModel):
    name: str
    path: str
    size: int
    model: str
    serial: str
    partitions: list[dict[str, Any]]
    in_use: bool
