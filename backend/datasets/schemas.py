from pydantic import BaseModel, Field, field_validator

from ..utils.validators import validate_dataset_path, validate_snapshot_name


class DatasetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    properties: dict[str, str] = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        if not validate_dataset_path(v):
            raise ValueError("Invalid dataset path")
        return v


class DatasetUpdate(BaseModel):
    properties: dict[str, str] = Field(..., min_length=1)


class DatasetResponse(BaseModel):
    name: str
    used: int
    available: int
    referenced: int
    mountpoint: str
    type: str


class SnapshotCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        if not validate_snapshot_name(v):
            raise ValueError("Invalid snapshot name")
        return v


class SnapshotResponse(BaseModel):
    full_name: str
    dataset: str
    name: str
    used: int
    referenced: int
    creation: str


class CloneCreate(BaseModel):
    target: str = Field(..., min_length=1, max_length=256)

    @field_validator("target")
    @classmethod
    def check_target(cls, v: str) -> str:
        if not validate_dataset_path(v):
            raise ValueError("Invalid clone target path")
        return v
