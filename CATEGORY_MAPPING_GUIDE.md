# 카테고리 태그 매핑 구현 가이드

## 📋 개요

메인 페이지에서 선택한 카테고리 태그가 백엔드로 전달되어 필터링된 결과를 보여주고, 상세 페이지에서 카테고리를 표시하는 완전한 흐름이 구현되었습니다.

## 🗂️ 구현된 파일 구조

```
frontend/
├── constants/
│   └── categories.ts          # 카테고리 데이터 정의 및 매핑
├── views/
│   ├── home_view.tsx          # 메인 페이지 (카테고리 필터링)
│   └── components/
│       └── searchbar.tsx      # 검색바 컴포넌트
├── app/
│   └── hotels/
│       └── [id]/
│           └── page.tsx       # 호텔 상세 페이지
└── packages/
    └── shared-types/
        └── index.ts           # Hotel 타입 정의

backend/
└── main.py                    # FastAPI 백엔드 (카테고리 필터링 로직)
```

## 🎯 1. 카테고리 데이터 정의 (`frontend/constants/categories.ts`)

### 구조
```typescript
export interface Category {
  label: string;  // UI에 표시될 텍스트
  icon: string;   // 카테고리 아이콘 (이모지)
  value: string;  // 백엔드 DB의 category 값과 매핑
}
```

### 카테고리 목록 (한국관광공사 표준 분류 코드)
| Label | Icon | Backend Value (코드) | 설명 |
|-------|------|---------------------|------|
| 전체 | 🏠 | 전체 | 모든 카테고리 |
| 호텔 | 🏢 | B02010100 | 관광호텔 |
| 펜션 | 🏡 | B02010700 | 펜션 |
| 한옥 | 🏮 | B02011600 | 한옥스테이 |
| 모텔 | 🛏️ | B02010900 | 일반 숙박시설 |
| 리조트 | 🏖️ | B02010500 | 콘도미니엄 |
| 게스트하우스 | 🏘️ | B02011100 | 게스트하우스 |
| 캠핑 | ⛺ | A02030100 | 야영장 |

### 유틸리티 함수
```typescript
// UI label → Backend value 변환 (코드로 변환)
getCategoryValue("캠핑") // → "A02030100"
getCategoryValue("호텔") // → "B02010100"

// Backend value → UI label 변환 (코드를 라벨로 변환)
getCategoryLabel("A02030100") // → "캠핑"
getCategoryLabel("B02010100") // → "호텔"
```

## 🔄 2. 메인 페이지 통합 로직 (`frontend/views/home_view.tsx`)

### 핵심 기능

1. **카테고리 상태 관리**
   ```typescript
   const [activeCategory, setActiveCategory] = useState("전체");
   ```

2. **카테고리 변환 및 API 호출**
   ```typescript
   const fetchLoadHotels = useCallback(async (q?: string, category?: string, pageNum: number = 1) => {
     // UI label을 백엔드 value로 변환
     const categoryValue = category === "전체" 
       ? undefined 
       : getCategoryValue(category ?? "전체");
     
     const data = await hotelService.fetchHotels({
       location: q,
       category: categoryValue,  // 변환된 값 전달
       page: pageNum,
     });
   }, []);
   ```

3. **카테고리 클릭 핸들러**
   ```typescript
   const handleCategoryClick = (item: string) => {
     setActiveCategory(item);
     setPage(1);           // 페이지 초기화
     setHotels([]);        // 기존 데이터 비우기
     fetchLoadHotels(searchQuery.trim() || undefined, item, 1);
   };
   ```

4. **카테고리 UI 렌더링**
   ```typescript
   {CATEGORIES.map((category) => (
     <button
       key={category.label}
       onClick={() => handleCategoryClick(category.label)}
       className={activeCategory === category.label ? "active" : ""}
     >
       <span>{category.icon}</span>
       <span>{category.label}</span>
     </button>
   ))}
   ```

## 🖥️ 3. 백엔드 필터링 로직 (`backend/main.py`)

### API 엔드포인트: `GET /api/hotels`

```python
@app.get("/api/hotels")
def get_hotels(
    page: int = Query(1, ge=1),
    limit: int = 20,
    category: str = None,
    location: str = None
):
    query = db.query(Hotel)
    
    # 1. 카테고리 필터링 (contains 사용)
    if category and category != "전체":
        query = query.filter(Hotel.category.contains(category))
    
    # 2. 통합 검색 필터
    if location:
        search_pattern = f"%{location}%"
        query = query.filter(
            (Hotel.name.ilike(search_pattern)) |
            (Hotel.address.ilike(search_pattern))
        )
    
    # 페이지네이션
    skip = (page - 1) * limit
    hotels = query.offset(skip).limit(limit).all()
    
    return {"hotels": results, "total": total, "count": len(results)}
```

### 주요 특징
- `contains()`: DB의 category 컬럼에 해당 값이 포함되어 있으면 필터링
- `ilike()`: 대소문자 구분 없는 검색 (PostgreSQL)
- 페이지네이션 지원

## 📄 4. 상세 페이지 (`frontend/app/hotels/[id]/page.tsx`)

### 카테고리 표시
```typescript
<div className="flex items-center gap-3 mb-4">
  <h1 className="text-3xl font-bold">{hotel.name}</h1>
  {hotel.category && (
    <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-700">
      {hotel.category}
    </span>
  )}
</div>
```

### API 응답 구조
```typescript
interface Hotel {
  id: number;
  name: string;
  address: string;
  category?: string;        // ✅ 추가됨
  price: number;
  rating: number;
  reviews: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  // ... 기타 필드
}
```

## 🔍 5. 매핑 검증 방법

### 1. 브라우저 개발자 도구 (Network 탭)
```
Request URL: http://localhost:8000/api/hotels?category=야영장&page=1
```
- "캠핑" 클릭 시 → `category=야영장`으로 전달되는지 확인

### 2. 상세 페이지에서 카테고리 확인
```typescript
// 디버깅용 코드 (임시)
console.log("선택한 카테고리:", activeCategory);
console.log("호텔 카테고리:", hotel.category);
```

### 3. 백엔드 로그 확인
```python
# main.py에 임시 로그 추가
print(f"[DEBUG] 카테고리 필터: {category}")
```

## 🎨 6. 사용자 흐름

```
1. 메인 페이지 진입
   ↓
2. 카테고리 태그 클릭 (예: "캠핑" ⛺)
   ↓
3. getCategoryValue("캠핑") → "A02030100"
   ↓
4. API 호출: GET /api/hotels?category=A02030100
   ↓
5. 백엔드: Hotel.category == "A02030100" (정확히 일치)
   ↓
6. 필터링된 결과 반환
   ↓
7. 호텔 카드 클릭
   ↓
8. 상세 페이지: getCategoryLabel("A02030100") → "캠핑" 표시
```

## ✅ 7. 체크리스트

- [x] 카테고리 상수 정의 (`constants/categories.ts`)
- [x] 카테고리 매핑 함수 구현 (`getCategoryValue`, `getCategoryLabel`)
- [x] 메인 페이지에서 카테고리 필터링 연동
- [x] 백엔드 API 카테고리 필터링 로직 구현
- [x] 상세 페이지에서 카테고리 표시
- [x] Hotel 타입에 category 필드 추가
- [x] 검색어와 카테고리 동시 사용 가능

## 🐛 8. 트러블슈팅

### 문제: 카테고리 필터링이 작동하지 않음
**해결책:**
1. DB의 category 값 확인: `SELECT DISTINCT category FROM hotels;`
2. 매핑 테이블 확인: `CATEGORIES` 배열의 `value`가 DB 값과 일치하는지 확인
3. 백엔드 로그 확인: 올바른 파라미터가 전달되는지 확인

### 문제: TypeScript 타입 에러
**해결책:**
```bash
# TypeScript 서버 재시작 (VSCode/Cursor)
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### 문제: "전체" 선택 시 모든 데이터가 안 나옴
**해결책:**
- 백엔드에서 `category == "전체"` 체크 확인
- 프론트엔드에서 `undefined` 전달 확인

## 🚀 9. 다음 단계 (선택사항)

1. **카테고리별 아이콘 개선**
   - SVG 아이콘으로 교체
   - 애니메이션 효과 추가

2. **카테고리 통계 표시**
   ```typescript
   // 각 카테고리별 숙소 개수 표시
   { label: "호텔", icon: "🏢", value: "호텔", count: 42 }
   ```

3. **URL 쿼리 파라미터 동기화**
   ```typescript
   // URL: /hotels?category=호텔&location=서울
   const router = useRouter();
   router.push(`/hotels?category=${activeCategory}`);
   ```

4. **카테고리 조합 필터**
   - 복수 카테고리 선택 가능
   - "호텔 + 리조트" 동시 필터링

## 📝 참고사항

- **DB 데이터 확인**: `backend/sync_data.py` 실행하여 데이터가 올바르게 저장되었는지 확인
- **캐싱**: 동일한 카테고리 재선택 시 불필요한 API 호출 방지 고려
- **성능**: 카테고리별 인덱스 추가 고려 (`CREATE INDEX idx_category ON hotels(category);`)
