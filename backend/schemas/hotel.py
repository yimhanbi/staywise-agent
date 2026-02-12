from pydantic import BaseModel


class HotelResponse(BaseModel):
    id: int
    name: str
    address: str | None
    price_per_night: int | None


class HotelListResponse(BaseModel):
    items: list[HotelResponse]
    total: int
