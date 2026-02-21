from pydantic import BaseModel, Field, field_validator
from typing import Any
from datetime import datetime

from ..utils.validators import validate_pool_name, validate_disk_path


class PoolCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    vdev_type: str = Field(..., pattern=r"^(stripe|mirror|raidz|raidz2|raidz3)$")
    disks: list[str] = Field(..., min_length=1)
    properties: dict[str, str] = Field(default_factory=dict)
    fs_properties: dict[str, str] = Field(default_factory=dict)
    force: bool = False
    mountpoint: str | None = None

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

    @field_validator("mountpoint")
    @classmethod
    def check_mountpoint(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith("/"):
            raise ValueError("Mountpoint must be an absolute path")
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


class PoolProperty(BaseModel):
    property: str
    value: str
    source: str


class PoolPropertiesResponse(BaseModel):
    properties: list[PoolProperty]
    features: list[PoolProperty]


class DiskResponse(BaseModel):
    name: str
    path: str
    size: int
    model: str
    serial: str
    partitions: list[dict[str, Any]]
    in_use: bool


# Scrub scheduling schemas
class ScrubScheduleCreate(BaseModel):
    pool: str
    frequency: str = Field("weekly", pattern=r"^(daily|weekly|monthly)$")
    day_of_week: int = Field(0, ge=0, le=6, description="0=Mon, 6=Sun")
    day_of_month: int = Field(1, ge=1, le=28)
    hour: int = Field(2, ge=0, le=23)
    minute: int = Field(0, ge=0, le=59)

    @field_validator("pool")
    @classmethod
    def check_pool(cls, v: str) -> str:
        if not validate_pool_name(v):
            raise ValueError("Invalid pool name")
        return v


class ScrubScheduleUpdate(BaseModel):
    frequency: str | None = Field(None, pattern=r"^(daily|weekly|monthly)$")
    day_of_week: int | None = Field(None, ge=0, le=6)
    day_of_month: int | None = Field(None, ge=1, le=28)
    hour: int | None = Field(None, ge=0, le=23)
    minute: int | None = Field(None, ge=0, le=59)
    enabled: bool | None = None


class ScrubScheduleResponse(BaseModel):
    id: int
    pool: str
    frequency: str
    day_of_week: int
    day_of_month: int
    hour: int
    minute: int
    enabled: bool
    last_run: float | None = None
    last_status: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
