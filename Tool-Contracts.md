### 1.1 Naming
-MCP input은 'snake_case'사용
-FastAPI query/path도 기존 API 규격에 맞춰 'snake_case'사용

### 1.2 Date/Number Validation

- `check_in`, `check_out`: `YYYY-MM-DD`
- `check_out`은 `check_in`보다 이후 날짜여야 함
- `guests`는 `1` 이상 정수
- `page`는 `1` 이상 정수


### 1.3 Common Error Schema
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "check_out must be after check_in",
    "details": {
      "field": "check_out"
    },
    "request_id": "req_123"
  }
}


### 2) Tool: 'search_hotels'


### 2.1 Description
호텔 목록을 검색하고, 날짜/인원/카테고리 필터를 적용해 페이지네이션된 결과를 반환한다.

###2.2 Input Schema 
```json
{
  "location": "string (optional)",
  "check_in": "string YYYY-MM-DD (optional)",
  "check_out": "string YYYY-MM-DD (optional)",
  "guests": "integer >= 1 (optional)",
  "category": "string (optional)",
  "page": "integer >= 1 (optional, default=1)"
}