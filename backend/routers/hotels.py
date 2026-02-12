from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional


#패키지에서 필요한 모듈 임포트
from database.connection import get_db_session
from database.models.hotel import Hotel
from schemas.hotel import HotelResponse, HotelListResponse

router = APIRouter(prefix="/hotels")

@router.get("", response_model=HotelListResponse)
async def list_hotels(
    q: Optional[str] = Query(None, description="검색어"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session) #DB 세션 주입
):
    stmt = select(Hotel)
    if q:
        stmt = stmt.where(Hotel.name.ilike(f"%{q}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    result = await db.execute(stmt.offset(offset).limit(limit))
    items = result.scalars().all()

    return HotelListResponse(items=items, total=total)


@router.get("/{hotel_id}", response_model=HotelResponse)
async def get_hotel(
    hotel_id:int, #DB 모델에 맞춰 int로 변경
    db: AsyncSession = Depends(get_db_session)
):
    
    #단건 조회
    hotel = await db.get(Hotel, hotel_id)
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    return hotel 



