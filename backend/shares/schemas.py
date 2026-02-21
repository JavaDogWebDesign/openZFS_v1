from pydantic import BaseModel, Field, field_validator

from ..utils.validators import validate_share_name, validate_fs_path, validate_nfs_client


class SMBShareCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    path: str = Field(..., min_length=1)
    comment: str = Field(default="")
    browseable: bool = Field(default=True)
    read_only: bool = Field(default=False)
    guest_ok: bool = Field(default=False)
    valid_users: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        if not validate_share_name(v):
            raise ValueError("Invalid share name")
        return v

    @field_validator("path")
    @classmethod
    def check_path(cls, v: str) -> str:
        if not validate_fs_path(v):
            raise ValueError("Invalid filesystem path")
        return v


class SMBShareUpdate(BaseModel):
    comment: str | None = None
    browseable: bool | None = None
    read_only: bool | None = None
    guest_ok: bool | None = None
    valid_users: list[str] | None = None


class SMBShareResponse(BaseModel):
    name: str
    path: str
    comment: str
    browseable: bool
    read_only: bool
    guest_ok: bool
    valid_users: list[str]


class NFSExportCreate(BaseModel):
    path: str = Field(..., min_length=1)
    client: str = Field(default="*")
    options: str = Field(default="rw,sync,no_subtree_check")

    @field_validator("path")
    @classmethod
    def check_path(cls, v: str) -> str:
        if not validate_fs_path(v):
            raise ValueError("Invalid filesystem path")
        return v

    @field_validator("client")
    @classmethod
    def check_client(cls, v: str) -> str:
        if not validate_nfs_client(v):
            raise ValueError("Invalid NFS client specification")
        return v


class NFSExportUpdate(BaseModel):
    client: str | None = None
    options: str | None = None

    @field_validator("client")
    @classmethod
    def check_client(cls, v: str | None) -> str | None:
        if v is not None and not validate_nfs_client(v):
            raise ValueError("Invalid NFS client specification")
        return v


class NFSExportResponse(BaseModel):
    id: int
    path: str
    client: str
    options: str

    model_config = {"from_attributes": True}
