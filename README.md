# Life Logger

가정 내 구성원들의 일상 활동(위치, 수면, 식사, 가전 사용 등)을 시계열로 기록하고 시각화하는 대시보드 애플리케이션입니다.

---

## 주요 기능

- **타임라인 대시보드** — 하루·1주·1달 단위로 가구별 · 구성원별 활동을 Gantt 형식으로 시각화
- **카테고리 필터** — 위치 / 활동(구간) / 이벤트(순간)를 독립적으로 ON/OFF, 기간이 길수록 자동으로 무거운 카테고리를 OFF로 설정해 초기 로딩 부하를 억제
- **API 유저별 토글** — API 요청 로그는 기본 숨김 상태이며 각 유저 행의 `API` 버튼으로 개별 활성화
- **실시간 ingest** — REST API로 새 이벤트를 수신하고 60초 간격으로 자동 갱신
- **관리 페이지** — 로그 직접 입력 및 위치·유저 관리 UI
- **스케줄·스케줄 타임라인** — 하루 단위 JSON 일괄 업로드(`POST /api/v1/schedules/batch`) 후 가구·사용자별 타임라인 조회

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Next.js 14 (App Router) · TypeScript · Tailwind CSS · TanStack Query |
| 백엔드 | FastAPI · SQLAlchemy (async) · Alembic |
| DB | PostgreSQL 16 |
| 인프라 | Docker Compose |

---

## 빠른 시작

### 요구 사항

- Docker & Docker Compose v2
- (선택) Node.js 20+ — 로컬 프론트엔드 개발 시

### 실행

```bash
# 1. 저장소 클론
git clone <repo-url>
cd life-logger

# 2. 서비스 시작 (백엔드 + DB)
docker compose up -d

# 3. DB 마이그레이션
docker compose exec backend alembic upgrade head

# 4. 샘플 데이터 삽입 (life_logs 등 — 스케줄 테이블은 포함하지 않음)
docker compose exec backend python scripts/seed.py

# 5. 프론트엔드 접속
open http://localhost:3000
```

> 백엔드 API: `http://localhost:8000`  
> API 문서(Swagger): `http://localhost:8000/docs`  
> `scripts/seed.py`는 **스케줄(`schedules`) 행을 넣지 않습니다.** 스케줄·스케줄 타임라인 화면을 쓰려면 아래 [스케줄·타임라인 데이터 올리기](#schedule-timeline-empty-db)를 따르세요.

---

<a id="schedule-timeline-empty-db"></a>

## 스케줄·타임라인 데이터 올리기 (빈 DB 가정)

스케줄 UI(`/schedule` 등)와 스케줄 타임라인은 **`schedules` 테이블**에 쌓인 행을 읽습니다. DB에 스케줄이 하나도 없으면 타임라인 응답의 `locations`가 비어 있거나 사용자 행만 비어 있는 상태로 보일 수 있습니다.

### 동작 요약

| 항목 | 설명 |
|------|------|
| **일괄 업로드** | `POST /api/v1/schedules/batch` — **한 요청 = 한 사용자의 하루(KST 기준)** 분량의 `entries` 배열 |
| **날짜 결정** | 첫 번째 `entries[0].datetime`을 KST로 변환한 **달력 날**이 그날로 간주됩니다. 같은 배열 안의 모든 시각은 가능하면 그 KST 날짜에 맞춥니다. |
| **사용자·가구** | 첫 번째 항목의 `user_id`가 그 배치 전체에 적용됩니다. `location_id`(또는 `metadata.home.locationId`)·`user_name` 등으로 **없으면 생성**됩니다. |
| **덮어쓰기** | `replace: true`(기본값)이면 해당 사용자·해당 KST 날의 기존 스케줄을 지운 뒤 다시 넣습니다. |
| **타임라인 조회** | `GET /api/v1/schedules/timeline?date=YYYYMMDD&days=N` — `date`는 **KST** 기준 시작일, `days`는 1~31 |

여러 명의 하루치를 넣으려면 **사용자마다 `batch` 요청을 한 번씩** 호출하면 됩니다.

여러 **날**을 한 화면에 보이게 하려면, 날짜마다(사용자마다) `batch`로 넣은 뒤 `GET .../timeline?date=시작일&days=N`으로 조회하면, 그 UTC·KST 구간에 들어오는 스케줄 행이 모두 합쳐져 반환됩니다.

### 최소 JSON 형식 (`POST /api/v1/schedules/batch`)

필수에 가깝게 줄인 예시입니다. `user_id`와 `location_id`는 고정 UUID를 쓰면 재현하기 좋습니다.

```json
{
  "replace": true,
  "user_name": "데모 사용자",
  "user_job": "데모 직업",
  "location_id": "11111111-1111-1111-1111-111111111111",
  "location_name": "데모 집",
  "timezone": "Asia/Seoul",
  "entries": [
    {
      "user_id": "22222222-2222-2222-2222-222222222222",
      "datetime": "2026-04-04T07:00:00+09:00",
      "description": "기상",
      "calls": [],
      "location": "집",
      "is_home": true,
      "metadata": {},
      "status": []
    },
    {
      "user_id": "22222222-2222-2222-2222-222222222222",
      "datetime": "2026-04-04T09:00:00+09:00",
      "description": "업무 시작",
      "calls": [],
      "location": "서재",
      "is_home": true,
      "metadata": {},
      "status": ["업무"]
    }
  ]
}
```

각 `entries[]` 항목에서 자주 쓰는 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| `user_id` | UUID 문자열 | 배치마다 첫 줄과 동일한 값 권장(서버는 첫 항목 기준으로 통일) |
| `datetime` | ISO 8601 | **타임존 포함** 권장(예: `...+09:00` 또는 `Z`) |
| `description` | 문자열 | 타임라인에 표시되는 한 줄 설명 |
| `calls` | 배열 | API 호출 이력 UI용. 없으면 `[]` |
| `location` | 문자열 | 자유 텍스트 위치 |
| `is_home` | bool | 집 여부 |
| `metadata` | 객체 | `home.locationId`로 가구 UUID를 줄 수 있음(`location_id`가 있으면 그쪽이 우선) |
| `status` | 문자열 배열 | 활동 태그(예: `["수면"]`, `["요리"]`) |

`calls` 항목 한 줄 형식(선택):

```json
{
  "method": "POST",
  "url": "/api/v1/example",
  "deviceId": "",
  "commands": [],
  "dsec": 0,
  "result": null
}
```

### curl 예시 (빈 DB에서 한 사용자·하루)

`sample-schedule-batch.json` 파일을 위 본문처럼 만든 뒤:

```bash
curl -sS -X POST "http://localhost:8000/api/v1/schedules/batch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hde-system" \
  -d @sample-schedule-batch.json
```

성공 시 `201`과 함께 `created`, `date`(YYYYMMDD), `user_id`, `location_id` 등이 돌아옵니다.

### 타임라인이 잡히는지 확인

```bash
# 2026-04-04(KST)부터 1일
curl -sS "http://localhost:8000/api/v1/schedules/timeline?date=20260404&days=1"

# 같은 시작일로 7일 범위
curl -sS "http://localhost:8000/api/v1/schedules/timeline?date=20260404&days=7"
```

`locations[].users[].entries`에 방금 넣은 시각순 행이 보이면 프론트 스케줄 타임라인과 동일한 데이터를 읽는 것입니다.

### 하루만 다시 올리기

같은 사용자·같은 KST 날에 대해 `replace: true`로 다시 `batch` 요청을 내면 해당 날 데이터만 교체됩니다.  
개별 삭제는 `DELETE /api/v1/schedules/day?user_id={uuid}&date=YYYYMMDD`(동일 `Authorization` 헤더 필요)도 사용할 수 있습니다.

### 흔한 이슈

- **타임라인이 비어 있음** — `date` 쿼리가 KST 기준인지, `entries`의 `datetime`이 그 날짜 범위(`days`) 안에 들어오는지 확인하세요.  
- **사용자가 타임라인에 안 나옴** — 해당 기간에 스케줄 행이 없거나, `user_id`가 잘못된 경우입니다.  
- **프론트는 `/api/v1/...`로 호출** — 브라우저에서는 Next 리라이트를 통해 백엔드로 전달됩니다. curl은 백엔드 포트 `8000`으로 직접 요청하면 됩니다.

---

## 샘플 데이터 구성

`scripts/seed.py`가 생성하는 가구 구성:

| 가구 | 위치 | 구성원 | 설명 |
|------|------|--------|------|
| 김씨네 집 | 서울 강남구 | 김민준, 김서연, 박지은 | 직장인 + 프리랜서 + 학생 (3인) |
| 이씨네 집 | 서울 마포구 | 이지호, 최수아 | 직장인 + 카페 아르바이트 (2인) |
| 정씨네 집 | 서울 서초구 | 정현우 | 재택근무 1인 가구 |

---

## 데이터 로드 최적화

### 문제

1주일·1달 범위를 조회할 때 순간 이벤트(냉장고, 세탁기 등)나 상세 활동 로그를 모두 불러오면 DB 쿼리·네트워크·렌더링 모두 과부하가 걸립니다.

### 해결 방법: 카테고리 선택 로딩

프론트엔드가 현재 필터 상태에서 **화면에 표시할 카테고리만** 백엔드에 요청합니다.

```
GET /api/v1/life-logs/timeline
  ?start=2026-03-01
  &end=2026-04-01
  &category=location          ← 위치만 요청 (1달 기본값)
```

백엔드는 `WHERE category IN (...)` 조건을 추가해 DB 스캔 범위를 줄입니다.

### 기간별 기본 필터

| 기간 | 위치 | 활동(구간) | 이벤트(순간) |
|------|:----:|:----------:|:------------:|
| 1일  | ✅   | ✅         | ✅           |
| 1주  | ✅   | ✅         | ❌           |
| 1달  | ✅   | ❌         | ❌           |

기간을 전환하면 필터가 해당 기간의 기본값으로 자동 리셋됩니다. 사용자는 필터 패널에서 직접 켜거나 끌 수 있으며, 무거운 조합일 때는 ⚠ 경고가 표시됩니다.

---

## 프로젝트 구조

```
life-logger/
├── backend/
│   ├── alembic/               # DB 마이그레이션
│   ├── app/
│   │   ├── api/v1/endpoints/  # FastAPI 라우터
│   │   ├── application/       # 서비스 레이어
│   │   ├── domain/            # 도메인 모델 & 레포지토리 인터페이스
│   │   └── infrastructure/    # SQLAlchemy 구현체
│   └── scripts/
│       └── seed.py            # 샘플 데이터 삽입 스크립트
└── frontend/
    └── src/
        ├── app/               # Next.js App Router 페이지
        ├── application/       # React Query 훅
        ├── components/
        │   ├── manage/        # 로그 관리 UI
        │   └── timeline/      # 타임라인 렌더링 컴포넌트
        ├── domain/            # 공유 타입 정의
        └── infrastructure/    # API 클라이언트
```

---

## API 주요 엔드포인트

### 인증 (관리자 토큰)

`/api/v1` 아래 **GET·HEAD·OPTIONS를 제외한 모든 메서드**(POST, PUT, PATCH, DELETE 등)는 헤더가 필요합니다.

```http
Authorization: Bearer hde-system
```

기본 토큰 문자열은 `hde-system`입니다. 백엔드는 환경 변수 `API_ADMIN_TOKEN`으로 바꿀 수 있습니다.

**웹 UI:** 사이드바 **관리자 로그인**에 동일한 토큰을 입력하면(검증용 기본값은 `NEXT_PUBLIC_API_ADMIN_TOKEN` 환경 변수, 없으면 `hde-system`) 브라우저 `sessionStorage`에 저장되고, **POST·PUT·PATCH·DELETE** 요청에만 `Authorization: Bearer …`가 붙습니다. 로그인하지 않은 상태에서는 조회만 가능합니다.  
Docker 빌드 시 `NEXT_PUBLIC_API_ADMIN_TOKEN`을 백엔드와 맞추면 로그인 시 입력해야 할 토큰도 그 값으로 맞춰집니다.

Swagger(`/docs`)의 Try it out으로 POST·DELETE 등을 호출할 때는 요청에 `Authorization: Bearer hde-system` 헤더를 직접 추가하세요(미들웨어에서 검사합니다).

### 타임라인 조회

```
GET /api/v1/life-logs/timeline
  ?start={YYYY-MM-DD}
  &end={YYYY-MM-DD}
  [&location_id={uuid}]        (여러 개 가능)
  [&category={category}]       (여러 개 가능: location · activity · event · api_request)
```

응답: 위치 → 유저 → 이벤트 목록으로 그룹핑된 JSON

### 이벤트 수집

```
POST /api/v1/life-logs
{
  "user_id": "...",
  "location_id": "...",
  "category": "activity",
  "event_type": "sleep",
  "started_at": "2026-03-29T23:00:00Z",
  "ended_at": null
}
```

### 이벤트 종료

```
PATCH /api/v1/life-logs/{id}/end
{ "ended_at": "2026-03-30T07:00:00Z" }
```

### 스케줄 (하루 단위 JSON 배치)

```
POST /api/v1/schedules/batch
Content-Type: application/json
```

본문은 `entries` 배열 + 선택 필드(`replace`, `user_name`, `location_id`, …). 상세 필드와 예시는 [스케줄·타임라인 데이터 올리기](#schedule-timeline-empty-db) 참고.

```
GET /api/v1/schedules?date=YYYYMMDD          # KST 하루 목록
GET /api/v1/schedules/timeline?date=YYYYMMDD&days=1   # 타임라인용 (days 1~31)
DELETE /api/v1/schedules/day?user_id={uuid}&date=YYYYMMDD
```

---

## 개발

### 백엔드 로컬 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 프론트엔드 로컬 실행

```bash
cd frontend
npm install
npm run dev
```

### 마이그레이션 생성

```bash
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
```

### 샘플 데이터 재삽입

DB 초기화 후 다시 삽입할 때:

```bash
# DB 초기화
docker compose exec db psql -U life_logger -c "TRUNCATE life_logs, users, locations RESTART IDENTITY CASCADE;"

# 재삽입
docker compose exec backend python scripts/seed.py
```
