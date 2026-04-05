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

# 2. 환경 변수 (.env) — Docker Compose 전에 필수
cp .env.example .env
# .env 를 열고 API_ADMIN_TOKEN 을 임의의 긴 비밀 문자열로 설정하세요 (예: openssl rand -hex 32).
# NEXT_PUBLIC_API_ADMIN_TOKEN 은 선택입니다. 비우면 프론트 번들에 토큰 힌트가 없고, 관리자 로그인 시
# 서버와 동일한 토큰을 직접 입력하면 됩니다. 값을 넣으면 API_ADMIN_TOKEN 과 같게 두는 것을 권장합니다.

# 3. 서비스 시작 (백엔드 + DB)
docker compose up -d

# 4. DB 마이그레이션
docker compose exec backend alembic upgrade head

# 5. 샘플 데이터 삽입 (life_logs 등 — 스케줄 테이블은 포함하지 않음)
docker compose exec backend python scripts/seed.py

# 6. 프론트엔드 접속
open http://localhost:3000
```

> 백엔드 API: `http://localhost:8000`  
> API 문서(Swagger): `http://localhost:8000/docs`  
> `scripts/seed.py`는 **스케줄(`schedules`) 행을 넣지 않습니다.** 스케줄·스케줄 타임라인 화면을 쓰려면 아래 [스케줄·타임라인 데이터 올리기](#schedule-timeline-empty-db)를 따르세요.

### PostgreSQL 데이터 영속성 (Docker)

DB 데이터는 **Docker 명명 볼륨**에 저장됩니다(`docker-compose.yml`에서 `postgres_data` → 컨테이너의 `/var/lib/postgresql/data`). Compose가 붙이는 실제 볼륨 이름은 보통 **「프로젝트 디렉터리(또는 `-p`로 준 프로젝트명)_postgres_data」** 형식입니다(예: 폴더가 `life-logger`이면 `life-logger_postgres_data`). `docker volume ls`로 확인할 수 있습니다. 컨테이너만 지워도 이 볼륨이 남아 있으면 **`docker compose up` 시 이전 데이터가 그대로 복구**됩니다.

| 동작 | 데이터 |
|------|--------|
| `docker compose up -d` / `docker compose down` | **유지** — 볼륨은 삭제되지 않음 |
| `docker compose down -v` | **삭제** — `-v`는 사용하지 않은 볼륨까지 제거하므로, 프로덕션·중요 데이터 환경에서는 **피하는 것이 좋음** |
| PC 재부팅 | **유지** — `postgres` 서비스에 `restart: unless-stopped`가 설정되어 있어 Compose를 다시 올리면 같은 볼륨에 붙음 |

**초기화 시점:** PostgreSQL 이미지는 **데이터 디렉터리가 비어 있을 때만** `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`로 클러스터를 만듭니다. 이미 볼륨에 데이터가 있는 상태에서 `.env`만 바꿔도 **기존 DB 인증 정보는 자동으로 바뀌지 않습니다.** 비밀번호를 바꾸려면 DB 안에서 `ALTER USER` 하거나, 정말 처음부터 다시 만들 때만 볼륨을 제거한 뒤 재기동하세요.

**백업 예시 (덤프):**

```bash
# 전체 DB 논리 백업 (스키마+데이터)
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-life_logger}" "${POSTGRES_DB:-life_logger}" > backup_$(date +%Y%m%d).sql

# 압축
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-life_logger}" "${POSTGRES_DB:-life_logger}" | gzip > backup_$(date +%Y%m%d).sql.gz
```

**복원 예시 (빈 DB 또는 덮어쓰기 전략에 맞게 조정):**

```bash
docker compose exec -T postgres psql -U "${POSTGRES_USER:-life_logger}" -d "${POSTGRES_DB:-life_logger}" < backup_20260404.sql
```

**볼륨 위치 확인:** Docker가 관리하는 경로이므로 직접 만질 필요는 거의 없습니다. `docker volume ls`로 `postgres_data`가 포함된 이름을 찾고, `docker volume inspect <볼륨이름>`으로 마운트 포인트 등을 볼 수 있습니다.

---

<a id="schedule-timeline-empty-db"></a>

## 스케줄·타임라인 데이터 올리기 (빈 DB 가정)

스케줄 UI(`/schedule` 등)와 스케줄 타임라인은 **`schedules` 테이블**에 쌓인 행을 읽습니다. DB에 스케줄이 하나도 없으면 타임라인 응답의 `locations`가 비어 있거나 사용자 행만 비어 있는 상태로 보일 수 있습니다.

### 동작 요약

| 항목 | 설명 |
|------|------|
| **일괄 업로드** | `POST /api/v1/schedules/batch` — **한 요청 = 한 사용자의 하루(KST 기준)** 분량의 `entries` 배열 |
| **날짜 결정** | 첫 번째 `entries[0].datetime`을 KST로 변환한 **달력 날**이 그날로 간주됩니다. 같은 배열 안의 모든 시각은 가능하면 그 KST 날짜에 맞춥니다. |
| **사용자·가구** | 첫 번째 항목의 `user_id` 또는 `account_id`(또는 배치 최상단 `account_id`)가 그 배치 전체에 적용됩니다. `location_id`(또는 `metadata.home.locationId`)·`user_name` 등으로 **없으면 생성**됩니다. 가구 메타: `residence_city`, `residence_type`, `country`. 계정 메타: `user_age`, `user_gender`, `user_personality`, `user_daily_style`. |
| **덮어쓰기** | `replace: true`(기본값)이면 해당 사용자·해당 KST 날의 기존 스케줄을 지운 뒤 다시 넣습니다. |
| **타임라인 조회** | `GET /api/v1/schedules/timeline?date=YYYYMMDD&days=N` — `date`는 **KST** 기준 시작일, `days`는 1~31 |

여러 명의 하루치를 넣으려면 **사용자마다 `batch` 요청을 한 번씩** 호출하면 됩니다.

여러 **날**을 한 화면에 보이게 하려면, 날짜마다(사용자마다) `batch`로 넣은 뒤 `GET .../timeline?date=시작일&days=N`으로 조회하면, 그 UTC·KST 구간에 들어오는 스케줄 행이 모두 합쳐져 반환됩니다.

### 최소 JSON 형식 (`POST /api/v1/schedules/batch`)

필수에 가깝게 줄인 예시입니다. `location_id`는 가구(집) UUID, `account_id`(또는 각 항목의 `user_id`)는 계정 UUID입니다. 배치 최상단에만 `account_id`를 두고 `entries`에서는 생략할 수 있습니다.

```json
{
  "replace": true,
  "account_id": "22222222-2222-2222-2222-222222222222",
  "user_name": "Jongsoo Yoon",
  "user_job": "Freelance developer",
  "user_age": 26,
  "user_gender": "Non-binary",
  "user_personality": "Easygoing, creative, tech-savvy",
  "user_daily_style": "Flexible hours, WFH-focused, uses smart devices for comfort and ambiance",
  "location_id": "23ffd83d-d23a-438d-aede-4ab9413d79f2",
  "location_name": "서울 원룸",
  "timezone": "Asia/Seoul",
  "residence_city": "서울",
  "residence_type": "원룸",
  "country": "한국",
  "entries": [
    {
      "datetime": "2026-04-04T07:00:00+09:00",
      "description": "기상",
      "calls": [],
      "location": "집",
      "is_home": true,
      "metadata": {},
      "status": []
    },
    {
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
| `user_id` / `account_id` | UUID 문자열 | 동일 의미의 계정 id. 첫 항목 또는 배치 최상단 `account_id` 중 하나 필수 |
| (배치 전용) | `user_age`, `user_gender`, `user_personality`, `user_daily_style` | 사용자 프로필(선택) |
| (배치 전용) | `residence_city`, `residence_type`, `country` | 가구(위치) 메타(선택) |
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
# 셸에서 .env 를 불러온 뒤(또는 직접 값을 넣어) Bearer 토큰을 지정하세요.
set -a && source .env && set +a   # bash — zsh 는 `export $(grep -v '^#' .env | xargs)` 등 사용
curl -sS -X POST "http://localhost:8000/api/v1/schedules/batch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_ADMIN_TOKEN}" \
  -d @sample-schedule-batch.json
```

성공 시 `201`과 함께 `created`, `date`(YYYYMMDD), `user_id`, `account_id`(동일 값), `location_id` 등이 돌아옵니다.

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
Authorization: Bearer <API_ADMIN_TOKEN 값>
```

- **백엔드** `API_ADMIN_TOKEN`은 **소스 코드에 기본값이 없습니다.** 반드시 환경 변수 또는 `.env`로 설정하세요(로컬 실행 시 `backend/` 또는 저장소 루트의 `.env`를 읽습니다).
- **Docker Compose**는 프로젝트 루트 `.env`의 `API_ADMIN_TOKEN`을 컨테이너에 넣습니다. 미설정 시 Compose가 시작 단계에서 오류를 냅니다.
- **프론트(Next.js)** `NEXT_PUBLIC_API_ADMIN_TOKEN`은 **선택**입니다. Docker 빌드 인자·환경으로 넣으면, 관리자 로그인 모달에서 입력값이 이 값과 일치할 때만 `sessionStorage`에 저장됩니다(클라이언트 번들에 값이 포함되므로 공개 배포 시 비우고 수동 입력만 쓰는 편이 더 안전할 수 있습니다). 비어 있으면 사용자가 **서버와 동일한 비밀 토큰**을 직접 입력해 저장하고, **POST·PUT·PATCH·DELETE** 시 그대로 `Authorization: Bearer …`로 전송합니다.
- 로그인하지 않은 상태에서는 조회(GET 등)만 가능합니다.

Swagger(`/docs`)의 Try it out으로 POST·DELETE 등을 호출할 때는 `.env`에 넣은 토큰과 동일한 `Authorization: Bearer …` 헤더를 추가하세요.

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

`API_ADMIN_TOKEN`이 없으면 앱이 기동하지 않습니다. 저장소 루트의 `.env`에 두거나, `backend/.env`에 두거나, 셸에서 `export API_ADMIN_TOKEN=...` 하세요.

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 프론트엔드 로컬 실행

`frontend/.env.example`을 참고해 `frontend/.env.local`에 `NEXT_PUBLIC_API_URL`·`NEXT_PUBLIC_API_ADMIN_TOKEN`(선택)을 넣으세요.

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
# DB 초기화 (테이블 데이터만 비움 — Docker 볼륨은 그대로)
docker compose exec postgres psql -U life_logger -d life_logger -c "TRUNCATE life_logs, users, locations RESTART IDENTITY CASCADE;"

# 재삽입
docker compose exec backend python scripts/seed.py
```
