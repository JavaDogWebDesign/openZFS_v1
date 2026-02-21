from pydantic import BaseModel
from typing import Any


class SmartInfo(BaseModel):
    available: bool
    healthy: bool | None = None
    temperature: int | None = None
    power_on_hours: int | None = None
    model_family: str | None = None
    rotation_rate: int | None = None  # 0 = SSD


class DriveResponse(BaseModel):
    name: str
    path: str
    size: int
    model: str
    serial: str
    type: str  # HDD | SSD | NVMe
    partitions: list[dict[str, Any]]
    in_use: bool
    pool: str | None = None
    smart: SmartInfo
