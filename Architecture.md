MCP = Orchestration, FastAPI = Domain Logic, DB = Source of Truth

[Client LLM/ APP]
-사용자 요청을 MCP Tool 호출 형태로 전달 
-비즈니스 로직 없음 (UI/대화 인터페이스 역할)

          |
          |
          V
[MCP server]
-Tool 인터페이스 제공('search_hotel','get_hotel_detail)
-입력 검증, 인증, 에러 표준화, 응답 정규화 담당
-여러 백엔드 호출이 필요할 때 오케스트레이션 수행 
-상태 저장/핵심 도메인 규칙은 소유하지 않음


[Existing FastAPI]
-호텔 검색/상세 조회 등 핵심 도메인 로직 담당
-필터링, 페이지네이션, 데이터 매핑 등 실제 비즈니스 규칙 수행
-DB 접근의 단일 진입점 역할 

          |
          |
          V
[DB]
-호텔 원천 데이터 저장
-FastAPI를 통해서만 접근 





