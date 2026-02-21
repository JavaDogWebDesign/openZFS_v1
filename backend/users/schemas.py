from pydantic import BaseModel, Field, field_validator

from ..utils.validators import validate_username, validate_group_name


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=32)
    password: str = Field(..., min_length=1)
    groups: list[str] = Field(default_factory=list)

    @field_validator("username")
    @classmethod
    def check_username(cls, v: str) -> str:
        if not validate_username(v):
            raise ValueError("Invalid username")
        return v

    @field_validator("groups")
    @classmethod
    def check_groups(cls, v: list[str]) -> list[str]:
        for g in v:
            if not validate_group_name(g):
                raise ValueError(f"Invalid group name: {g}")
        return v


class PasswordChange(BaseModel):
    password: str = Field(..., min_length=1)


class GroupUpdate(BaseModel):
    groups: list[str]

    @field_validator("groups")
    @classmethod
    def check_groups(cls, v: list[str]) -> list[str]:
        for g in v:
            if not validate_group_name(g):
                raise ValueError(f"Invalid group name: {g}")
        return v


class SmbPasswordSet(BaseModel):
    password: str = Field(..., min_length=1)


class SystemUserResponse(BaseModel):
    username: str
    uid: int
    gid: int
    home: str
    shell: str
    groups: list[str]
