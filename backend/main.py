from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import create_engine, ForeignKey
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import asyncio
import os
import random
import json
import math
import urllib.error
import urllib.parse
import urllib.request
import logging
import base64
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from typing import Literal, Optional
from mcp_client import call_mcp_tool
from ollama_agent import run_agent


class AiSearchRequest(BaseModel):
    location: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    guests: Optional[int] = Field(default=None, ge=1)
    category: Optional[str] = None
    page: int = Field(default=1, ge=1)


class AiChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AiChatRequest(BaseModel):
    messages: list[AiChatTurn] = Field(max_length=16)
    conversation_id: Optional[str] = None


class BookingCreateRequest(BaseModel):
    hotel_id: int = Field(gt=0)
    check_in: str
    check_out: str
    guests: int = Field(ge=1, le=20)


class PaymentConfirmRequest(BaseModel):
    payment_key: str = Field(min_length=1, max_length=200)
    order_id: str = Field(min_length=6, max_length=64)
    amount: int = Field(gt=0)

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
logger = logging.getLogger("staywise.ai")


def raise_mcp_tool_error(result):
    if isinstance(result, dict) and "error" in result:
        error = result["error"]
        code = error.get("code", "INTERNAL_ERROR")

        status_code = 500
        if code == "INVALID_INPUT":
            status_code = 400
        elif code == "NOT_FOUND":
            status_code = 404
        elif code == "UPSTREAM_ERROR":
            status_code = 502

        raise HTTPException(status_code=status_code, detail=error)


async def call_mcp_api(tool_name: str, arguments: dict):
    logger.info("MCP tool call started: tool=%s", tool_name)
    try:
        result = await call_mcp_tool(tool_name, arguments)
    except Exception as exc:
        logger.exception("MCP tool call crashed: tool=%s", tool_name)
        raise HTTPException(
            status_code=502,
            detail={"code": "MCP_CALL_FAILED", "message": type(exc).__name__},
        ) from exc

    if isinstance(result, dict) and "error" in result:
        error = result["error"]
        logger.error(
            "MCP tool returned an error: tool=%s code=%s",
            tool_name,
            error.get("code", "UNKNOWN"),
        )
    else:
        logger.info("MCP tool call succeeded: tool=%s", tool_name)
    raise_mcp_tool_error(result)
    return result


@app.post("/api/ai/search")
async def ai_search_hotels(payload: AiSearchRequest):
    return await call_mcp_api(
        "search_hotels",
        {
            "location": payload.location,
            "check_in": payload.check_in,
            "check_out": payload.check_out,
            "guests": payload.guests,
            "category": payload.category,
            "page": payload.page,
        },
    )


@app.post("/api/ai/chat")
async def ai_chat(payload: AiChatRequest):
    if payload.messages and payload.messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="마지막 대화는 사용자 메시지여야 합니다.")

    try:
        conversation_id = str(uuid.UUID(payload.conversation_id)) if payload.conversation_id else str(uuid.uuid4())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="대화 ID가 올바르지 않습니다.") from exc

    db = SessionLocal()
    try:
        conversation_record = db.query(AiConversation).filter(AiConversation.id == conversation_id).first()
        if conversation_record is None:
            conversation_record = AiConversation(id=conversation_id, title="새 대화")
            db.add(conversation_record)
            db.flush()

        stored_messages = (
            db.query(AiConversationMessage)
            .filter(AiConversationMessage.conversation_id == conversation_id)
            .order_by(AiConversationMessage.id.asc())
            .all()
        )
        history = [{"role": item.role, "content": item.content} for item in stored_messages]
        if payload.messages:
            latest_user_message = payload.messages[-1].content
            db.add(AiConversationMessage(
                conversation_id=conversation_id,
                role="user",
                content=latest_user_message,
            ))
            if conversation_record.title == "새 대화":
                conversation_record.title = latest_user_message.strip()[:120] or "새 대화"
            history.append({"role": "user", "content": latest_user_message})
        conversation_record.updated_at = datetime.utcnow()
        db.commit()
        history = history[-16:]
    except Exception as exc:
        db.rollback()
        logger.exception("Could not load or store AI conversation: id=%s", conversation_id)
        raise HTTPException(status_code=500, detail="대화 기록을 저장하지 못했습니다.") from exc
    finally:
        db.close()

    async def stream_chat():
        loop = asyncio.get_running_loop()
        progress_queue: asyncio.Queue[tuple[str, dict]] = asyncio.Queue()

        def notify_progress(message: str):
            loop.call_soon_threadsafe(
                progress_queue.put_nowait, ("progress", {"message": message})
            )

        def notify_token(text: str):
            loop.call_soon_threadsafe(
                progress_queue.put_nowait, ("token", {"text": text})
            )

        def reset_draft():
            loop.call_soon_threadsafe(progress_queue.put_nowait, ("reset", {}))

        def sse_event(event: str, payload: dict) -> str:
            return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

        logger.info("AI chat started: id=%s turns=%d", conversation_id, len(history))
        notify_progress("대화 요청을 처리하고 있어요…")
        task = asyncio.create_task(
            run_agent(
                history,
                call_mcp_api,
                on_progress=notify_progress,
                on_token=notify_token,
                on_reset=reset_draft,
            )
        )
        try:
            while not task.done():
                try:
                    event, data = await asyncio.wait_for(progress_queue.get(), timeout=8)
                    yield sse_event(event, data)
                except asyncio.TimeoutError:
                    yield sse_event("progress", {"message": "모델 응답을 기다리고 있어요…"})

            result = await task
            result["conversation_id"] = conversation_id
            db = SessionLocal()
            try:
                conversation_record = db.query(AiConversation).filter(AiConversation.id == conversation_id).first()
                if conversation_record is None:
                    raise RuntimeError("대화 세션을 저장하는 중 찾을 수 없습니다.")
                stored_metadata = {
                    "hotels": result.get("hotels", []),
                    "total": result.get("total", 0),
                    "search": result.get("search"),
                }
                db.add(AiConversationMessage(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=result.get("reply", ""),
                    metadata_json=json.dumps(stored_metadata, ensure_ascii=False),
                ))
                conversation_record.updated_at = datetime.utcnow()
                db.commit()
            finally:
                db.close()
            logger.info("AI chat completed: id=%s hotels=%d", conversation_id, len(result.get("hotels", [])))
            yield sse_event("result", result)
        except RuntimeError as exc:
            logger.error("AI chat dependency error: %s", exc)
            yield sse_event("error", {"message": str(exc)})
        except Exception as exc:
            logger.exception("AI chat crashed: error_type=%s", type(exc).__name__)
            yield sse_event(
                "error",
                {"message": "AI 채팅 처리 중 오류가 발생했습니다. 백엔드 터미널 로그를 확인해 주세요."},
            )

    return StreamingResponse(
        stream_chat(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )


@app.get("/api/mcp/health")
async def mcp_health_check():
    return await call_mcp_api("health_check", {})


@app.get("/api/mcp/hotels/{hotel_id}")
async def mcp_get_hotel_detail(hotel_id: int):
    return await call_mcp_api("get_hotel_detail", {"hotel_id": hotel_id})


def kakao_rest_request(url: str, accept: str) -> bytes:
    rest_key = os.getenv("KAKAO_REST_API_KEY", "").strip()
    if not rest_key:
        raise HTTPException(
            status_code=503,
            detail="KAKAO_REST_API_KEY가 backend/.env에 설정되지 않았습니다.",
        )

    request = urllib.request.Request(
        url,
        headers={"Authorization": f"KakaoAK {rest_key}", "Accept": accept},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as upstream:
            return upstream.read()
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            raise HTTPException(
                status_code=502,
                detail="카카오 REST API 인증에 실패했습니다. REST API 키와 카카오맵 API 사용 설정을 확인해 주세요.",
            ) from exc
        raise HTTPException(
            status_code=502,
            detail=f"카카오 정적 지도 요청에 실패했습니다 (HTTP {exc.code}).",
        ) from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise HTTPException(
            status_code=502,
            detail="카카오 REST API에 연결할 수 없습니다.",
        ) from exc


@app.get("/api/maps/static")
def get_kakao_static_map(
    latitude: Optional[float] = Query(default=None),
    longitude: Optional[float] = Query(default=None),
    address: Optional[str] = Query(default=None, max_length=500),
):
    """Return a Kakao static map image through the server-side REST API."""
    if (latitude is None) != (longitude is None):
        raise HTTPException(status_code=400, detail="latitude와 longitude를 함께 전달해야 합니다.")

    if latitude is not None and longitude is not None:
        if (
            not math.isfinite(latitude)
            or not math.isfinite(longitude)
            or not -90 <= latitude <= 90
            or not -180 <= longitude <= 180
        ):
            raise HTTPException(status_code=400, detail="유효하지 않은 좌표입니다.")
        lat, lng = latitude, longitude
    elif address and address.strip():
        geocode_url = "https://dapi.kakao.com/v2/local/search/address.json?" + urllib.parse.urlencode(
            {"query": address.strip()}
        )
        try:
            geocode_response = kakao_rest_request(geocode_url, "application/json")
            documents = json.loads(geocode_response).get("documents", [])
        except (json.JSONDecodeError, AttributeError) as exc:
            raise HTTPException(status_code=502, detail="카카오 주소 검색 응답을 해석할 수 없습니다.") from exc
        if not documents:
            raise HTTPException(status_code=404, detail="주소에서 지도 좌표를 찾지 못했습니다.")
        lat = float(documents[0]["y"])
        lng = float(documents[0]["x"])
    else:
        raise HTTPException(status_code=400, detail="좌표 또는 주소가 필요합니다.")

    center = f"{lng},{lat}"
    map_url = "https://dapi.kakao.com/v2/maps/staticmap?" + urllib.parse.urlencode(
        {
            "center": center,
            "markers": f"location:{center}|option:false",
            "size": "640x400",
            "lv": "3",
            "scale": "2",
        }
    )
    image_bytes = kakao_rest_request(map_url, "image/png")
    return Response(
        content=image_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )

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
from sqlalchemy import Column, Integer, String, Float, Text, DateTime

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


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(64), unique=True, nullable=False, index=True)
    hotel_id = Column(Integer, nullable=False, index=True)
    hotel_name = Column(String(255), nullable=False)
    check_in = Column(String(10), nullable=False)
    check_out = Column(String(10), nullable=False)
    guests = Column(Integer, nullable=False)
    nights = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=False)
    status = Column(String(32), nullable=False, default="PENDING_PAYMENT")
    payment_key = Column(String(200), unique=True, nullable=True)
    created_at = Column(String(32), nullable=False, default=lambda: datetime.utcnow().isoformat())


class AiConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String(36), primary_key=True)
    title = Column(String(120), nullable=False, default="새 대화")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)


class AiConversationMessage(Base):
    __tablename__ = "ai_conversation_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(36), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


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


@app.get("/api/ai/conversations")
def list_ai_conversations(limit: int = Query(20, ge=1, le=100)):
    db = SessionLocal()
    try:
        conversations = (
            db.query(AiConversation)
            .order_by(AiConversation.updated_at.desc())
            .limit(limit)
            .all()
        )
        return {
            "conversations": [
                {
                    "id": item.id,
                    "title": item.title,
                    "updated_at": item.updated_at.isoformat(),
                }
                for item in conversations
            ]
        }
    finally:
        db.close()


@app.get("/api/ai/conversations/{conversation_id}")
def get_ai_conversation(conversation_id: str):
    try:
        conversation_id = str(uuid.UUID(conversation_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="대화 ID가 올바르지 않습니다.") from exc

    db = SessionLocal()
    try:
        conversation = db.query(AiConversation).filter(AiConversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="저장된 대화를 찾을 수 없습니다.")
        messages = (
            db.query(AiConversationMessage)
            .filter(AiConversationMessage.conversation_id == conversation_id)
            .order_by(AiConversationMessage.id.asc())
            .all()
        )
        return {
            "id": conversation.id,
            "title": conversation.title,
            "messages": [
                {
                    "id": message.id,
                    "role": message.role,
                    "content": message.content,
                    "metadata": json.loads(message.metadata_json or "{}"),
                    "created_at": message.created_at.isoformat(),
                }
                for message in messages
            ],
        }
    finally:
        db.close()

@app.get("/api/hotels")
def get_hotels(
    page: int = Query(1, ge=1),
    limit: int = 20,
    category: str = None,
    search: str = None,
    location: str = None 
):
    """
    숙박 정보 조회
    - page: 페이지 번호 (1부터 시작)
    - limit: 최대 조회 개수 (기본 20개)
    - category: 카테고리 필터 (한국관광공사 표준 분류 코드)
      * B02010100: 관광호텔
      * B02010500: 콘도미니엄(리조트)
      * B02010700: 펜션
      * B02010900: 모텔
      * B02011100: 게스트하우스
      * B02011600: 한옥
      * A02030100: 야영장(캠핑)
    - location: 위치 검색어 (이름 또는 주소)
    - search: 검색어 (이름 또는 주소)
    """
    db = SessionLocal()
    
    try:
        query = db.query(Hotel)
        
        # 1. 카테고리 필터링 (한국관광공사 표준 분류 코드로 정확히 매칭)
        if category and category != "전체":
            query = query.filter(Hotel.category == category)
            
        # 2. 통합 검색 필터 (location 또는 search 파라미터 사용)
        search_term = location or search
        if search_term:
            clean_search = search_term.strip()
            search_pattern = f"%{clean_search}%"
            query = query.filter(
                (Hotel.name.ilike(search_pattern)) |
                (Hotel.address.ilike(search_pattern))
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
                "latitude": hotel.latitude,
                "longitude": hotel.longitude,
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
        
        # 일관된 랜덤 데이터 생성 (seed 사용)
        stay_info = generate_random_stay_info(seed=hotel.id)
        copy = generate_copy()
        
        # 가격 생성 (리스트와 동일한 로직)
        random.seed(hotel.id)
        price = random.randrange(50000, 550000, 10000)
        rating = round(random.uniform(3.8, 5.0), 2)
        reviews = random.randint(10, 300)
        
        return {
            "id": hotel.id,
            "name": hotel.name,
            "address": hotel.address,
            "category": hotel.category,
            "phone": hotel.phone,
            "homepage": hotel.homepage,
            "latitude": hotel.latitude,
            "longitude": hotel.longitude,
            "description": copy["description"],
            "content_id": hotel.content_id,
            "imageUrl": f"https://loremflickr.com/800/600/mansion,villa,hotel/all?lock={hotel.id}",
            "price": price,
            "price_per_night": price,
            "rating": rating,
            "reviews": reviews,
            "max_guests": stay_info["max_guests"],
            "bedrooms": stay_info["bedrooms"],
            "beds": stay_info["beds"],
            "bathrooms": stay_info["bathrooms"],
            "badges": copy["badges"],
            "urgency_message": copy["urgency"],
        }
        
    finally:
        db.close()


def get_hotel_nightly_price(hotel_id: int) -> int:
    # Keep checkout price consistent with the deterministic price on hotel detail.
    return random.Random(hotel_id).randrange(50000, 550000, 10000)


@app.post("/api/bookings")
def create_booking(payload: BookingCreateRequest):
    try:
        check_in = datetime.strptime(payload.check_in, "%Y-%m-%d").date()
        check_out = datetime.strptime(payload.check_out, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="체크인/체크아웃 날짜 형식은 YYYY-MM-DD여야 합니다.") from exc

    if check_in < datetime.now().date() or check_out <= check_in:
        raise HTTPException(status_code=400, detail="유효한 체크인/체크아웃 날짜를 선택해 주세요.")

    db = SessionLocal()
    try:
        hotel = db.query(Hotel).filter(Hotel.id == payload.hotel_id).first()
        if not hotel:
            raise HTTPException(status_code=404, detail="숙소를 찾을 수 없습니다.")

        nights = (check_out - check_in).days
        amount = get_hotel_nightly_price(hotel.id) * nights
        order_id = f"sw_{uuid.uuid4().hex[:28]}"
        booking = Booking(
            order_id=order_id,
            hotel_id=hotel.id,
            hotel_name=hotel.name,
            check_in=check_in.isoformat(),
            check_out=check_out.isoformat(),
            guests=payload.guests,
            nights=nights,
            amount=amount,
            status="PENDING_PAYMENT",
        )
        db.add(booking)
        db.commit()
        return {
            "order_id": order_id,
            "hotel_name": hotel.name,
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "guests": payload.guests,
            "nights": nights,
            "amount": amount,
            "status": booking.status,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Booking creation failed")
        raise HTTPException(status_code=500, detail="예약 생성에 실패했습니다.") from exc
    finally:
        db.close()


@app.post("/api/payments/confirm")
def confirm_payment(payload: PaymentConfirmRequest):
    secret_key = os.getenv("TOSS_SECRET_KEY", "").strip()
    if not secret_key:
        raise HTTPException(status_code=503, detail="백엔드 TOSS_SECRET_KEY가 설정되지 않았습니다.")

    db = SessionLocal()
    try:
        booking = db.query(Booking).filter(Booking.order_id == payload.order_id).with_for_update().first()
        if not booking:
            raise HTTPException(status_code=404, detail="예약 주문을 찾을 수 없습니다.")
        if booking.amount != payload.amount:
            raise HTTPException(status_code=400, detail="결제 금액이 예약 금액과 일치하지 않습니다.")
        if booking.status == "CONFIRMED" and booking.payment_key == payload.payment_key:
            return {"order_id": booking.order_id, "status": booking.status, "amount": booking.amount}
        if booking.status != "PENDING_PAYMENT":
            raise HTTPException(status_code=409, detail="결제 가능한 예약 상태가 아닙니다.")

        auth = base64.b64encode(f"{secret_key}:".encode()).decode()
        request = urllib.request.Request(
            "https://api.tosspayments.com/v1/payments/confirm",
            data=json.dumps({
                "paymentKey": payload.payment_key,
                "orderId": payload.order_id,
                "amount": payload.amount,
            }).encode(),
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                toss_result = json.loads(response.read().decode())
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode(errors="replace")
            logger.error("Toss payment confirmation rejected: status=%s body=%s", exc.code, error_body)
            raise HTTPException(status_code=502, detail="토스 결제 승인에 실패했습니다. 테스트 키 쌍과 결제 정보를 확인해 주세요.") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            logger.exception("Toss payment confirmation connection failed")
            raise HTTPException(status_code=502, detail="토스 결제 승인 서버에 연결하지 못했습니다.") from exc

        if toss_result.get("orderId") != booking.order_id or toss_result.get("totalAmount") != booking.amount:
            logger.error("Toss confirmation returned mismatched order or amount: order_id=%s", booking.order_id)
            raise HTTPException(status_code=502, detail="토스 승인 결과의 주문 또는 금액 검증에 실패했습니다.")

        booking.payment_key = payload.payment_key
        booking.status = "CONFIRMED"
        db.commit()
        return {"order_id": booking.order_id, "hotel_name": booking.hotel_name, "status": booking.status, "amount": booking.amount}
    except HTTPException:
        db.rollback()
        raise
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
