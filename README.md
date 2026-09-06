# 급할 때 화장실

## GitHub Pages 배포

이 폴더는 GitHub Pages용 정적 사이트로 설정되어 있습니다.

1. GitHub에서 새 저장소를 만듭니다. 저장소 이름은 원하는 이름으로 정해도 됩니다.
2. 이 폴더 전체를 새 저장소에 올립니다.
3. GitHub 저장소의 **Settings → Pages → Build and deployment**에서 **GitHub Actions**를 선택합니다.
4. `main` 브랜치에 코드를 올리면 Actions가 자동으로 빌드하고 Pages에 게시합니다.

처음 공개한 뒤 GitHub의 Actions 화면에서 **Deploy GitHub Pages**가 완료됐는지 확인하세요.

배포 주소는 보통 `https://사용자명.github.io/저장소명/` 형식입니다. 저장소를 `사용자명.github.io`로 만들면 루트 주소로 사용할 수 있습니다.
서울 공공·개방 화장실과 지하철 화장실을 함께 검색하고 지도 앱으로 길찾기하는 웹앱입니다.

## 데이터
- 서울시 공중화장실 위치정보 OA-22586: https://data.seoul.go.kr/dataList/OA-22586/S/1/datasetView.do
- 서울교통공사 역사장애인화장실정보: https://www.data.go.kr/data/15118705/fileData.do (2026-02-12 기준)
- 다운로드 날짜: 2026-09-06. 서울시 자료에는 개별 기준일이 없어 수집일만 표시합니다.
- 원본 서울시 4,447행 + 기존 지하철 284행. 서울시 완전 중복 27행 제거, 일대일로 확실히 대응하는 지하철 39행을 상세정보로 보강하여 4,665건으로 제공합니다.
- 공공·개방 4,093건 / 지하철 572건. 전체는 시설·화장실 등록정보 건수이며 개별 건물 수가 아닙니다. 동일 역의 서로 다른 화장실, 층별 화장실, 또는 일치 여부가 불확실한 기록은 유지합니다.
- 정적 스냅샷이며 자동 갱신되지 않습니다. 원본은 data/, 병합 감사 기록은 data/merge-audit.json, 재생성은 python3 scripts/merge-data.py.
- 공공누리 1유형 출처 표시. 서울시 공중화장실 데이터는 민간 개방 시설을 포함합니다.

## 시간·편의시설
정확한 매일 운영시간과 24시간 정보만 Asia/Seoul 기준으로 판정합니다. 자정 이후 종료(24:30, 익일01:00 등)를 지원합니다. 평일/공휴일/계절별/복수 시간표와 영업시간 내 등 모호한 자료는 확인 필요로 남겨두고 개방시간 필터에서 제외합니다. 실시간 문 열림 상태가 아닙니다. 미기재 편의시설은 없다고 단정하지 않습니다. 지하철 상세정보는 서울교통공사 자료를 우선합니다. 거리는 직선거리이며 위치는 브라우저에서만 처리합니다.

## 지도 앱
- 카카오맵: 공식 Web API 가이드의 좌표 목적지 링크. https://apis.map.kakao.com/web/guide/
- 네이버지도: 공식 URL Scheme의 route/walk와 appname. Android intent, iOS nmap. 앱 설치 링크와 네이버 웹 장소 검색 대안을 함께 표시합니다. https://guide.ncloud-docs.com/docs/maps-url-scheme
- T맵: 모바일 앱 자동차 경로 연결. Android goalname/goalx/goaly와 iOS rGoName/rGoX/rGoY 전달. 앱 설치 링크를 함께 표시합니다. T맵 공식 SDK 및 앱 연동 문서: https://tmapapi.tmapmobility.com/main.html#android/docs/androidDoc.TMapTapi_invokeRoute
- 실제 휴대폰 앱 전환은 현 환경에서 검증하지 못했습니다. 인앱 브라우저가 외부 앱 호출을 차단하는 경우 시스템 브라우저에서 열어야 합니다.

## 검증
node --experimental-strip-types scripts/validate.mjs
npx tsc --noEmit
npm run build

시간 경계, 야간 운영, 불명확한 시간표, 데이터 범위·ID·기존 지하철 보존, 지도 링크 좌표 순서와 한글/특수문자 인코딩을 검증합니다. 브라우저 UI 테스트는 요청 범위에 포함되지 않아 수행하지 않았습니다.
WebMCP filter_restrooms/select_restroom은 기존 기능을 유지하며 장애인용 필터를 추가했습니다. 지원 검증 컨텍스트가 없어 WebMCP 실동작 검증은 수행하지 못했습니다.
