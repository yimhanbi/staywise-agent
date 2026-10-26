# Staywise

**Staywise**는 자연어 대화와 검색 필터로 국내 숙소를 찾아보고, 후보를 비교하고, 데모 예약과 테스트 결제 흐름까지 경험할 수 있는 포트폴리오 프로젝트입니다. Ollama 로컬 모델과 MCP 도구를 연결해 AI가 숙소 검색 및 상세 조회를 수행하도록 구성했습니다.

> **데모 안내**: 숙소명·주소·일부 소개는 한국관광공사 공공데이터를 기반으로 합니다. 사진은 예시 이미지이며, 요금은 화면 흐름을 위한 예시 금액입니다. 평점, 객실 구성, 실시간 재고 및 실제 예약 확정은 숙소 운영 정보와 연결되어 있지 않습니다. 결제는 Toss Payments 테스트 키로만 확인해 주세요.

## 주요 기능

- 지역과 숙소 유형(호텔, 펜션, 한옥, 게스트하우스, 모텔, 캠핑, 리조트 등)으로 숙소 검색 및 카테고리 필터링
- 숙소 상세 모달, 주소·좌표 기반 카카오 정적 지도, 여러 숙소 사진 예시 표시
- Staywise AI 대화창: Ollama 로컬 모델에 자연어로 숙소 검색 요청
- MCP 도구를 통한 숙소 검색·상세 조회·백엔드 상태 확인
- 검색 결과 비교, 대화 기록 저장 및 이전 대화 불러오기
- 회원가입·로그인, 계정별 좋아요 숙소 및 예약 내역
- 예약 정보 입력, 예약 데이터 저장, Toss Payments 테스트 결제 승인·실패 흐름
- 공공데이터포털 한국관광공사 숙박 정보 동기화 스크립트

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| 프런트엔드 | Next.js 15, React 19, TypeScript, Tailwind CSS |
| 백엔드 | Python, FastAPI, SQLAlchemy |
| AI | Ollama, Gemma 4 E2B (기본 모델) |
| 도구 연동 | Model Context Protocol (MCP), stdio |
| 데이터베이스 | PostgreSQL (Docker용 pgvector 이미지) |
| 외부 연동 | 한국관광공사 공공데이터, Kakao Static Map REST API, Toss Payments 테스트 결제 |

## 구조

```text
staywise-agent/
├── frontend/                 # Next.js 웹 앱, 페이지와 UI 컴포넌트
├── backend/                  # FastAPI, 인증·예약·결제 API, Ollama 에이전트, MCP 서버/클라이언트
├── packages/
│   ├── database/             # SQLAlchemy 비동기 DB 패키지
│   └── shared-types/         # 프런트엔드 공통 타입과 검색 스키마
├── apps/mcp-bridge/          # MCP 브리지 앱 영역
├── services/api/             # API 서비스 영역
└── docker-compose.yml        # 로컬 PostgreSQL + pgvector
```

### 요청 흐름

```text
일반 검색: Next.js → FastAPI → MCP stdio 도구 → FastAPI 숙소 API → PostgreSQL
AI 대화:   Next.js → FastAPI → Ollama ↔ MCP 도구 → 숙소 검색/상세 API
결제 데모: Next.js → 예약 API → Toss Payments 테스트 결제 → 서버 승인 API
```

MCP 서버는 `search_hotels`, `get_hotel_detail`, `health_check` 도구를 제공합니다. 대화 기록은 데이터베이스에 저장되며 로그인 계정의 예약과 좋아요 목록도 데이터베이스에서 관리합니다.

## 로컬 실행

### 1. 필수 환경

- Node.js 및 pnpm
- Python 3.10 이상
- Docker Desktop 또는 Docker 호환 엔진
- Ollama 및 Gemma 모델 (AI 대화 기능을 사용할 때)

### 2. 프런트엔드 패키지 설치

저장소 루트에서 워크스페이스 패키지를 설치합니다.

```bash
pnpm install
```

### 3. 데이터베이스 실행

저장소 루트에서:

```bash
docker compose up -d
```

기본 로컬 DB 접속 값은 `user / password`, 데이터베이스 이름은 `staywise`, 포트는 `5432`입니다.

### 4. 백엔드 환경 변수와 실행

터미널에서:

```bash
cd backend
cp -n .env.example .env      # 기존 .env가 있으면 유지
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

`backend/.env`에 로컬 DB 주소와 사용할 키를 설정합니다. 키 원문은 저장소에 커밋하지 마세요.

```env
DATABASE_URL=postgresql://user:password@localhost:5432/staywise
DATA_GO_KR_SERVICE_KEY=한국관광공사_서비스_키
KAKAO_REST_API_KEY=카카오_REST_API_키
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e2b
TOSS_SECRET_KEY=test_sk_토스_시크릿_키
SESSION_SECRET=충분히_긴_임의의_세션_서명_키
SESSION_COOKIE_SECURE=false
```

한국관광공사 데이터를 처음 채우려면 DB와 백엔드 환경 변수를 준비한 다음 별도 터미널에서 실행합니다.

```bash
cd backend
source .venv/bin/activate
python sync_data.py
```

한국관광공사 키가 없거나 데이터 동기화를 하지 않은 경우 숙소 목록이 비어 있을 수 있습니다. 카카오 키는 백엔드에서 정적 지도 요청에 사용합니다.

### 5. Ollama 모델 준비

Ollama를 실행한 뒤 모델을 내려받습니다.

```bash
ollama pull gemma4:e2b
```

기본 주소와 모델 이름은 `OLLAMA_BASE_URL`, `OLLAMA_MODEL` 환경 변수로 변경할 수 있습니다.

### 6. 프런트엔드 환경 변수와 실행

새 터미널에서 저장소 루트 기준:

```bash
cp -n frontend/.env.example frontend/.env.local  # 기존 키 설정 유지
```

`frontend/.env.local`에 Toss Payments **테스트 클라이언트 키**를 설정합니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_토스_테스트_클라이언트_키
```

그 다음 저장소 루트에서:

```bash
pnpm --filter @staywise/web dev
```

웹 앱은 [http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다. 프런트엔드 환경 변수 변경 후에는 Next.js 개발 서버를 재시작하세요.

## 주요 API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/ai/chat` | Ollama 대화 및 MCP 도구 호출 |
| `POST` | `/api/ai/search` | MCP를 통한 AI 숙소 검색 |
| `GET` | `/api/hotels` | 위치·분류·날짜 기반 목록 조회 |
| `GET` | `/api/hotels/{hotel_id}` | 숙소 상세 조회 |
| `GET` | `/api/maps/static` | Kakao Static Map 이미지 프록시 |
| `POST` / `GET` | `/api/auth/...` | 회원가입·로그인·세션·로그아웃 |
| `GET` | `/api/ai/conversations` | 저장한 대화 목록 조회 |
| `GET` | `/api/ai/conversations/{conversation_id}` | 대화 기록 불러오기 |
| `GET` | `/api/favorites` | 로그인 사용자의 좋아요 목록 조회 |
| `PUT` / `DELETE` | `/api/favorites/{hotel_id}` | 숙소 좋아요 추가·삭제 |
| `POST` | `/api/bookings` | 데모 예약 생성 |
| `GET` | `/api/bookings/me` | 로그인 사용자의 예약 내역 조회 |
| `POST` | `/api/payments/confirm` | 서버 측 Toss 결제 승인 확인 |

## 포트폴리오 데모 범위

- 실제 객실 재고, 운영자 예약 확정, 실제 숙박 요금 및 숙소별 평점은 연동되어 있지 않습니다.
- 카드의 사진은 해당 숙소에서 제공한 실제 사진이라고 보장하지 않습니다.
- 예약 흐름은 테스트용 예시 요금으로 동작합니다. `TOSS_SECRET_KEY`는 백엔드에만 두고 `NEXT_PUBLIC_` 환경 변수로 만들지 마세요.
- AI는 로컬 Ollama 모델이므로 응답 속도와 검색 조건 추출 결과가 컴퓨터 성능 및 모델 응답에 따라 달라질 수 있습니다.

## 환경 변수 참고

| 변수 | 위치 | 용도 |
| --- | --- | --- |
| `DATABASE_URL` | `backend/.env` | FastAPI 및 데이터 동기화 DB 연결 |
| `DATA_GO_KR_SERVICE_KEY` | `backend/.env` | 한국관광공사 숙박 정보 수집 |
| `KAKAO_REST_API_KEY` | `backend/.env` | 서버 측 카카오 정적 지도 |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | `backend/.env` | 로컬 Ollama 주소와 모델 |
| `TOSS_SECRET_KEY` | `backend/.env` | 서버 결제 승인 (비공개 키) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | `frontend/.env.local` | 결제 SDK 클라이언트 키 (테스트 키 권장) |
| `SESSION_SECRET` | `backend/.env` | 로그인 세션 서명 |
