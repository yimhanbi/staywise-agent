# Staywise

호텔 검색 웹 앱과 MCP 기반 숙소 검색 도구를 연결한 모노레포 프로젝트입니다.

## 구현 기능

- 지역·카테고리 조건과 페이지로 숙소 검색
- 숙소 상세 정보와 위치 지도 표시
- 백엔드 프록시를 통한 Kakao REST 정적 지도 표시 (드래그·줌 미지원)
- 한국관광공사 숙박 데이터 수집 스크립트
- MCP `search_hotels`, `get_hotel_detail`, `health_check` 도구
- 웹 검색·상세 요청을 FastAPI에서 MCP 도구 호출로 전달

날짜와 인원 값은 MCP 도구에서 검증·전달하지만, 예약 객실 재고가 없어 실제 예약 가능 여부는 검색하지 않습니다. 자연어 LLM 대화, 예약 확정, 결제 기능도 아직 구현되지 않았습니다. 숙소 카드의 일부 가격·평점·소개 문구는 데모용 생성 데이터입니다.

## 요청 흐름

```text
Next.js → FastAPI → MCP stdio client → Staywise MCP tools
                                      → FastAPI hotel API → PostgreSQL
```

세부 실행 방법과 MCP 도구 정보는 [backend/README.md](backend/README.md)를 참고하세요.

## 주요 디렉터리

```text
frontend/          Next.js 웹 앱
backend/           FastAPI API, MCP 서버 및 MCP 클라이언트
packages/database/ SQLAlchemy 데이터베이스 패키지
packages/shared-types/ 프런트엔드 공유 스키마와 타입
```
