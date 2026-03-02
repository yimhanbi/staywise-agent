from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import and_,not_,func
from geoalchemy2 import Geometry 
from geoalchemy2.functions import ST_DWithin, ST_MakePoint
from app.models.hotel import Hotel, Room, Booking

class SearchService:
    @staticmethod
    def get_available_hotels(
        db:Session,
        check_in: date,
        check_out: date,
        guests: int = 2,
        lat: float = None,
        lng: float = None,
        radius_km: float = 10.0
    ):
        
        
        # 날짜 중복 체크
        unavailable_rooms_query = db.query(Booking.room_id).filter(
            and_(
                Booking.check_in < check_out,
                Booking.cehck_out > check_in
            )
        ).subquery()
        
        # 메인 쿼리 시작
        query = db.query(Hotel).join(Room)
        
        #필터링 = 예약 가능한 방이 있는지
        query = query.filter(not_(Room.id.in_(unavailable_rooms_query)))
        
        #필터링 = 최대 수용 인원을 만족하는지
        query = query.filter(Room.max_occupancy >= guests)
        
        #필터링 위치 기반 검색 (postGIS 활용)
        if lat is not None and lng is not None:
            #반경 radius_km를 미터 단위로 변환하여 검색
            user_location = ST_MakePoint(lng,lat)
            qeury = query.filter(
                ST_DWithin(Hotel.location, user_location, radius_km * 1000)
            )
            
            
        #결과 반환
        return query.distinct().all()
        
