export interface Category {
  label: string;
  icon: string;
  value: string;
}

/**
 * 카테고리 데이터 정의 및 매핑
 * - label: UI에 표시될 텍스트
 * - icon: 카테고리 아이콘 (이모지)
 * - value: 백엔드 DB의 category 코드 (한국관광공사 표준 분류 코드)
 * 
 * 한국관광공사 숙박 분류 코드:
 * - B02010100: 관광호텔 (79개)
 * - B02010500: 콘도미니엄 (4개)
 * - B02010600: 유스호스텔 (5개)
 * - B02010700: 펜션 (135개)
 * - B02010900: 모텔 (42개)
 * - B02011100: 게스트하우스 (48개)
 * - B02011600: 한옥 (110개)
 * - A02030100: 야영장/캠핑 (13개)
 * 
 * 추가 코드 (소량):
 * - B02011000: 호스텔 (3개)
 * - B02011200: 민박 (4개)
 * - B02011300: 휴양콘도미니엄 (1개)
 * - A02010400: 관광지 (1개)
 * - A02020200: 문화시설 (3개)
 */
export const CATEGORIES: Category[] = [
  { label: "전체", icon: "🏠", value: "전체" },
  { label: "호텔", icon: "🏢", value: "B02010100" },
  { label: "펜션", icon: "🏡", value: "B02010700" },
  { label: "한옥", icon: "🏮", value: "B02011600" },
  { label: "게스트하우스", icon: "🏘️", value: "B02011100" },
  { label: "모텔", icon: "🛏️", value: "B02010900" },
  { label: "호스텔", icon: "🧳", value: "B02011000" },
  { label: "유스호스텔", icon: "🎒", value: "B02010600" },
  { label: "민박", icon: "🏠", value: "B02011200" },
  { label: "캠핑", icon: "⛺", value: "A02030100" },
  { label: "리조트", icon: "🏖️", value: "B02010500" },
];

/**
 * 전체 카테고리 코드 매핑 (UI에 표시되지 않는 코드 포함)
 */
const CATEGORY_CODE_MAP: Record<string, string> = {
  "B02010100": "호텔",
  "B02010500": "리조트",
  "B02010600": "유스호스텔",
  "B02010700": "펜션",
  "B02010900": "모텔",
  "B02011000": "호스텔",
  "B02011100": "게스트하우스",
  "B02011200": "민박",
  "B02011300": "휴양콘도",
  "B02011600": "한옥",
  "A02030100": "캠핑",
  "A02010400": "관광지",
  "A02020200": "문화시설",
};

/**
 * 카테고리 label로 value 찾기
 */
export const getCategoryValue = (label: string): string => {
  const category = CATEGORIES.find((cat) => cat.label === label);
  return category?.value ?? label;
};

/**
 * 카테고리 value로 label 찾기
 * 먼저 CATEGORIES에서 찾고, 없으면 CATEGORY_CODE_MAP에서 찾음
 */
export const getCategoryLabel = (value: string): string => {
  // 먼저 주요 카테고리에서 찾기
  const category = CATEGORIES.find((cat) => cat.value === value);
  if (category) return category.label;
  
  // 없으면 전체 코드 매핑에서 찾기
  return CATEGORY_CODE_MAP[value] ?? value;
};
