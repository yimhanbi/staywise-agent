import os
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from category_mapping import infer_category_from_name

# .env 파일에서 환경 변수 불러오기
load_dotenv()

# 데이터베이스 연결 설정
DATABASE_URL = os.getenv("DATABASE_URL")
SERVICE_KEY = os.getenv("DATA_GO_KR_SERVICE_KEY")

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL이 .env 파일에 설정되지 않았습니다!")
if not SERVICE_KEY:
    raise ValueError("❌ DATA_GO_KR_SERVICE_KEY가 .env 파일에 설정되지 않았습니다!")

# SQLAlchemy 엔진 생성
engine = create_engine(DATABASE_URL)
Base = declarative_base()

# 숙박 데이터 테이블 정의
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

# 테이블 생성
print("📊 데이터베이스 테이블 생성 중...")
Base.metadata.create_all(engine)
print("✅ 테이블 생성 완료!")

# 세션 생성
Session = sessionmaker(bind=engine)
session = Session()

# 공공데이터포털 API 호출 함수
def fetch_accommodation_data(page_no=1, num_of_rows=100):
    """한국관광공사 숙박정보 API 호출 (GW 버전)"""
    # searchStay2 사용 (숙박정보 전용 엔드포인트)
    base_url = "http://apis.data.go.kr/B551011/KorService2/searchStay2"
    
    params = {
        "serviceKey": SERVICE_KEY,
        "numOfRows": num_of_rows,
        "pageNo": page_no,
        "MobileOS": "ETC",
        "MobileApp": "StayWise",
        "_type": "json"
        # listYN, arrange 파라미터 제거 (searchStay2는 지원 안 함)
    }
    
    try:
        print(f"🔍 API 호출 중... (페이지: {page_no})")
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if "response" not in data:
            print("⚠️ 예상치 못한 API 응답 형식:", data)
            return []
        
        body = data["response"].get("body")
        if not body:
            print("⚠️ body 데이터가 없습니다.")
            return []
        
        items = body.get("items")
        if not items or not items.get("item"):
            print("ℹ️ 더 이상 데이터가 없습니다.")
            return []
        
        return items["item"]
    
    except requests.exceptions.RequestException as e:
        print(f"❌ API 호출 실패: {e}")
        return []

# 데이터 저장 함수
def save_hotels_to_db(hotels_data):
    """받아온 숙박 데이터를 저장하고 기존 데이터의 누락 분류도 보완"""
    saved_count = 0
    updated_count = 0
    
    for item in hotels_data:
        content_id = item.get("contentid")
        
        existing = session.query(Hotel).filter_by(content_id=str(content_id)).first()
        category = (item.get("cat3") or "").strip() or infer_category_from_name(item.get("title"))
        if existing:
            if not (existing.category or "").strip() and category:
                existing.category = category
                updated_count += 1
            continue
        
        hotel = Hotel(
            name=item.get("title", "정보 없음"),
            address=item.get("addr1", "") + " " + item.get("addr2", "").strip(),
            category=category or "",
            phone=item.get("tel", ""),
            homepage=item.get("homepage", ""),
            latitude=float(item.get("mapy", 0)) if item.get("mapy") else None,
            longitude=float(item.get("mapx", 0)) if item.get("mapx") else None,
            description=item.get("overview", ""),
            content_id=str(content_id)
        )
        
        session.add(hotel)
        saved_count += 1
    
    if saved_count > 0 or updated_count > 0:
        session.commit()
        print(f"✅ 새 숙박 {saved_count}개 저장, 기존 숙박 {updated_count}개 분류 보완 완료!")
    else:
        print("ℹ️ 새로 저장할 데이터가 없습니다.")
    
    return saved_count

# 메인 실행
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🏨 StayWise 숙박 데이터 동기화 시작")
    print("="*60 + "\n")
    
    total_saved = 0
    page = 1
    max_pages = 5
    
    while page <= max_pages:
        hotels = fetch_accommodation_data(page_no=page, num_of_rows=100)
        
        if not hotels:
            print(f"📄 {page}페이지에서 데이터 없음. 종료합니다.")
            break
        
        saved = save_hotels_to_db(hotels)
        total_saved += saved
        
        print(f"📄 페이지 {page} 처리 완료 (누적 저장: {total_saved}개)\n")
        page += 1
    
    print("="*60)
    print(f"🎉 동기화 완료! 총 {total_saved}개의 숙박 정보가 저장되었습니다.")
    print("="*60)
    
    total_count = session.query(Hotel).count()
    print(f"\n📊 현재 DB에 저장된 총 숙박 정보: {total_count}개")
    
    sample_hotels = session.query(Hotel).limit(3).all()
    if sample_hotels:
        print("\n📋 샘플 데이터:")
        for h in sample_hotels:
            print(f"  - {h.name} ({h.address})")
    
    session.close()
    print("\n✅ 모든 작업이 완료되었습니다!")
