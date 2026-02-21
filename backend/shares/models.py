from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class NFSExport(Base):
    __tablename__ = "nfs_exports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    client: Mapped[str] = mapped_column(String(256), nullable=False, default="*")
    options: Mapped[str] = mapped_column(Text, nullable=False, default="rw,sync,no_subtree_check")
