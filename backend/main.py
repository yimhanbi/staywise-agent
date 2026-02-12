from fastapi import FastAPI, HTTPException,Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import random

# 환경 변수 로드
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

# 데이터베이스 연결
DATABASE_URL = os.getenv("DATABASE_URL")
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
            results.append({
                "id": hotel.id,
                "name": hotel.name,
                "address": hotel.address,
                "category": hotel.category or "가성비",
                "image_url":f"https://picsum.photos/seed/{hotel.id}/300/200",
                "price": random.randrange(50000, 500001, 1000),
                "rating": round(random.uniform(3.5, 5.0), 1),
                "reviews": random.randint(10, 500),
            })
        
        return {
            "total": total,
            "count": len(results),
            "hotels": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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
            "content_id": hotel.content_id
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
