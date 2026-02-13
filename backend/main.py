from fastapi import FastAPI, HTTPException,Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import random
from datetime import datetime, timedelta

TYPE_DESCRIPTIONS = {
    "city": [
        "도심 속에서 편안한 휴식을 즐길 수 있는 공간입니다.",
        "이동이 편리해 여행 일정을 효율적으로 구성할 수 있습니다.",
        "주요 명소와 가까워 짧은 일정에도 잘 어울리는 숙소입니다.",
    ],
    "nature": [
        "자연에 둘러싸여 온전한 휴식을 즐길 수 있는 공간입니다.",
        "조용한 환경에서 일상의 리듬을 되찾기에 좋은 숙소입니다.",
        "창밖 풍경만으로도 충분한 여유를 느낄 수 있습니다.",
    ],
    "emotional": [
        "머무는 시간 자체가 특별하게 느껴지는 공간입니다.",
        "공간 곳곳에 섬세한 분위기가 담긴 숙소입니다.",
        "사진보다 직접 머물렀을 때 더 매력적인 공간입니다.",
    ],
    "business": [
        "업무와 휴식을 균형 있게 병행할 수 있는 숙소입니다.",
        "조용한 환경과 안정적인 편의시설을 갖추고 있습니다.",
        "출장이나 단기 체류에 적합한 공간입니다.",
    ],
}

BASE_DESCRIPTIONS = [
    "하루의 끝을 편안하게 마무리할 수 있습니다.",
    "여행의 피로를 부드럽게 풀어주는 공간입니다.",
    "누구와 함께 머물러도 만족도가 높은 숙소입니다.",
]

URGENCY_MESSAGES = [
    "최근 많은 게스트가 이 숙소를 확인하고 있어요.",
    "비슷한 숙소보다 빠르게 예약되고 있어요.",
    "선택하신 날짜는 관심이 집중되고 있어요.",
    "최근 예약이 꾸준히 이어지고 있어요.",
]

BADGES = ["인기 숙소", "요즘 핫한 숙소", "빠른 예약", "조회 급증"]


def generate_random_stay_info(seed=None):
    """인원을 기준으로 침실·침대·욕실을 상식적으로 결정."""
    if seed is not None:
        rng = random.Random(seed)
    else:
        rng = random
    max_guests = rng.choice([2, 4, 6, 8])
    if max_guests <= 2:
        bedrooms = 1
    elif max_guests <= 4:
        bedrooms = rng.randint(1, 2)
    else:
        bedrooms = rng.randint(2, 4)
    beds = rng.randint((max_guests // 2), max_guests)
    bathrooms = max(1, bedrooms - rng.randint(0, 1))
    return {
        "max_guests": max_guests,
        "bedrooms": bedrooms,
        "beds": beds,
        "bathrooms": bathrooms,
    }


def generate_copy():
    hotel_type = random.choice(list(TYPE_DESCRIPTIONS.keys()))
    description = (
        f"{random.choice(TYPE_DESCRIPTIONS[hotel_type])} "
        f"{random.choice(BASE_DESCRIPTIONS)}"
    )

    urgency = None
    if random.random() < 0.45:
        urgency = random.choice(URGENCY_MESSAGES)

    badges = random.sample(BADGES, k=random.randint(0, 2))

    return {
        "type": hotel_type,
        "description": description,
        "urgency": urgency,
        "badges": badges,
    }

# 환경 변수 로드 (backend 디렉터리 또는 프로젝트 루트의 .env)
load_dotenv()

# FastAPI 앱 생성
app = FastAPI(title="StayWise API")

# CORS 설정 (Next.js 프론트엔드와 통신)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 기본 포트
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 연결 (DATABASE_URL 없으면 기본값 사용 — .env에서 설정 권장)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/staywise",
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 데이터베이스 모델 import (sync_data.py와 동일한 구조)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Float, Text

Base = declarative_base()

class Hotel(Base):
    __tablename__ = "hotels"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500))
    category = Column(String(100))
    phone = Column(String(50))
    homepage = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    content_id = Column(String(50), unique=True)


# 테이블이 없으면 생성 (앱 시작 시 한 번)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    import traceback
    print(f"[StayWise] DB 테이블 생성 확인 실패 (계속 진행): {e}")
    traceback.print_exc()

# API 엔드포인트
@app.get("/")
def read_root():
    """API 상태 확인"""
    return {
        "message": "🏨 StayWise API가 정상 작동 중입니다!",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/hotels")
def get_hotels(
    page: int = Query(1, ge=1),
    limit: int = 20,
    category: str = None,
    search: str = None
):
    """
    숙박 정보 조회
    - skip: 건너뛸 개수 (페이지네이션)
    - limit: 최대 조회 개수 (기본 20개)
    - category: 카테고리 필터 (예: 호텔, 모텔)
    - search: 검색어 (이름 또는 주소)
    """
    db = SessionLocal()
    
    try:
        query = db.query(Hotel)
        
        # 카테고리 필터
        if category and category != "전체":
            query = query.filter(Hotel.category.contains(category))
        
        # 검색 필터
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Hotel.name.like(search_pattern)) | 
                (Hotel.address.like(search_pattern))
            )
        
        # 전체 개수
        total = query.count()
        
        
        #페이지네이션 계산 로직 변경
        skip = (page -1)* limit
        
        # 결과 조회
        hotels = query.offset(skip).limit(limit).all()
        
        # 응답 데이터 변환
        results = []
        for hotel in hotels:
            copy = generate_copy()
            stay_info = generate_random_stay_info(seed=hotel.id)
            start_offset = random.randint(1, 30)
            stay_days = random.randint(1, 7)
            base_date = datetime.now() + timedelta(days=start_offset)
            end_date = base_date + timedelta(days=stay_days)

            date_range = f"{base_date.month}월 {base_date.day}일 ~ {end_date.day}일"
            if base_date.month != end_date.month:
                date_range = (
                    f"{base_date.month}월 {base_date.day}일 ~ "
                    f"{end_date.month}월 {end_date.day}일"
                )

            results.append({
                "id": hotel.id,
                "name": hotel.name,
                "address": hotel.address,
                "category": hotel.category,
                "image_url": f"https://loremflickr.com/800/600/mansion,villa,hotel/all?lock={hotel.id}",
                "price": random.randrange(50000, 550000, 10000),
                "rating": round(random.uniform(3.8, 5.0), 2),
                "reviews": random.randint(10, 300),
                "date_range": date_range,
                "stay_nights": stay_days,
                "description": copy["description"],
                "urgency": copy["urgency"],
                "urgency_message": copy["urgency"],
                "badges": copy["badges"],
                "hotel_type": copy["type"],
                "max_guests": stay_info["max_guests"],
                "bedrooms": stay_info["bedrooms"],
                "beds": stay_info["beds"],
                "bathrooms": stay_info["bathrooms"],
            })
        
        return {
            "total": total,
            "count": len(results),
            "hotels": results
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        detail = str(e)
        if "does not exist" in detail or "relation" in detail.lower():
            detail = f"{detail} — DB에 hotels 테이블이 없을 수 있습니다. backend에서 python sync_data.py 실행 후 재시도하세요."
        raise HTTPException(status_code=500, detail=detail)
    finally:
        db.close()


@app.get("/api/hotels/{hotel_id}")
def get_hotel_detail(hotel_id: int):
    """특정 숙박 상세 정보 조회"""
    db = SessionLocal()
    
    try:
        hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
        
        if not hotel:
            raise HTTPException(status_code=404, detail="숙박 정보를 찾을 수 없습니다")
        stay_info = generate_random_stay_info(seed=hotel.id)
        return {
            "id": hotel.id,
            "name": hotel.name,
            "address": hotel.address,
            "category": hotel.category,
            "phone": hotel.phone,
            "homepage": hotel.homepage,
            "latitude": hotel.latitude,
            "longitude": hotel.longitude,
            "description": hotel.description,
            "content_id": hotel.content_id,
            "max_guests": stay_info["max_guests"],
            "bedrooms": stay_info["bedrooms"],
            "beds": stay_info["beds"],
            "bathrooms": stay_info["bathrooms"],
        }
        
    finally:
        db.close()

@app.get("/api/stats")
def get_statistics():
    """데이터베이스 통계"""
    db = SessionLocal()
    
    try:
        total_hotels = db.query(Hotel).count()
        
        # 카테고리별 통계
        categories = db.query(
            Hotel.category, 
            db.func.count(Hotel.id)
        ).group_by(Hotel.category).all()
        
        category_stats = {cat: count for cat, count in categories if cat}
        
        return {
            "total_hotels": total_hotels,
            "categories": category_stats
        }
        
    finally:
        db.close()

# 서버 실행
if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 StayWise 백엔드 서버 시작")
    print("="*60)
    print("📍 API 주소: http://localhost:8000")
    print("📖 API 문서: http://localhost:8000/docs")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
