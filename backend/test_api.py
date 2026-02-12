import os
import requests
from dotenv import load_dotenv

load_dotenv()

SERVICE_KEY = os.getenv("DATA_GO_KR_SERVICE_KEY")

print("="*60)
print("🔍 API 테스트 시작")
print("="*60)
print(f"\n사용 중인 키: {SERVICE_KEY[:20]}...")
print(f"키 길이: {len(SERVICE_KEY)}")
print(f"특수문자 확인: '+' 있음: {'+' in SERVICE_KEY}, '=' 있음: {'=' in SERVICE_KEY}")
print()

# 테스트 1: 전국호텔현황 API 호출
base_url = "http://api.data.go.kr/openapi/tn_pubr_public_htel_info_api"

params = {
    "serviceKey": SERVICE_KEY,
    "pageNo": 1,
    "numOfRows": 10,
    "type": "json"
}

print("📡 API 호출 중...")
print(f"URL: {base_url}")
print()

try:
    response = requests.get(base_url, params=params, timeout=10)
    print(f"✅ 응답 코드: {response.status_code}")
    print(f"✅ 응답 URL: {response.url[:100]}...")
    print()
    
    # JSON 파싱 시도
    try:
        data = response.json()
        print("📄 응답 내용:")
        print(data)
        print()
        
        # 에러 메시지 확인
        if "response" in data:
            header = data["response"].get("header", {})
            result_code = header.get("resultCode")
            result_msg = header.get("resultMsg")
            
            print(f"결과 코드: {result_code}")
            print(f"결과 메시지: {result_msg}")
            
            if result_code != "0000":
                print(f"\n❌ API 에러 발생!")
                print(f"에러 코드: {result_code}")
                print(f"에러 메시지: {result_msg}")
                
    except Exception as e:
        print(f"❌ JSON 파싱 실패: {e}")
        print(f"원본 응답: {response.text[:500]}")
        
except requests.exceptions.RequestException as e:
    print(f"❌ 요청 실패: {e}")

print("\n" + "="*60)
print("테스트 완료")
print("="*60)