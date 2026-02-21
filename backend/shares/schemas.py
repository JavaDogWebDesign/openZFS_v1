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
    write_list: list[str] = Field(default_factory=list)
    create_mask: str = Field(default="")
    directory_mask: str = Field(default="")
    force_user: str = Field(default="")
    force_group: str = Field(default="")
    inherit_permissions: bool = Field(default=False)
    vfs_objects: list[str] = Field(default_factory=list)

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
    write_list: list[str] | None = None
    create_mask: str | None = None
    directory_mask: str | None = None
    force_user: str | None = None
    force_group: str | None = None
    inherit_permissions: bool | None = None
    vfs_objects: list[str] | None = None


class SMBShareResponse(BaseModel):
    name: str
    path: str
    comment: str
    browseable: bool
    read_only: bool
    guest_ok: bool
    valid_users: list[str]
    write_list: list[str] = []
    create_mask: str = ""
    directory_mask: str = ""
    force_user: str = ""
    force_group: str = ""
    inherit_permissions: bool = False
    vfs_objects: list[str] = []


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
