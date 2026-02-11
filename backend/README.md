# Staywise API (FastAPI)

## 지금 당장 만들어야 할 백엔드 기능

1. **헬스 체크** — `GET /health` (API·DB 상태)
2. **호텔 목록/검색** — `GET /hotels`, `GET /hotels/{id}` (목록·상세, 검색 파라미터)
3. **예약 생성·조회** — `POST /bookings`, `GET /bookings` (예약 생성, 내 예약 목록)
4. **DB 연결** — PostgreSQL + pgvector (패키지 `packages/database` 연동)
5. **공통 스키마** — `packages/shared-types`와 Pydantic 스키마 맞춤

## 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

DB는 프로젝트 루트에서 `docker compose up -d` 후 `DATABASE_URL` 설정.
