from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Text
from .base import Base

class Hotel(Base):
    __tablename__ = "hotels"


    id: Mapped[str] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(511))
    price_per_night: Mapped[int] = mapped_column(Integer)


    