# Life Logger

가정 내 구성원들의 일상 활동(위치, 수면, 식사, 가전 사용 등)을 시계열로 기록하고 시각화하는 대시보드 애플리케이션입니다.

---

## 주요 기능

- **타임라인 대시보드** — 하루·1주·1달 단위로 가구별 · 구성원별 활동을 Gantt 형식으로 시각화
- **카테고리 필터** — 위치 / 활동(구간) / 이벤트(순간)를 독립적으로 ON/OFF, 기간이 길수록 자동으로 무거운 카테고리를 OFF로 설정해 초기 로딩 부하를 억제
- **API 유저별 토글** — API 요청 로그는 기본 숨김 상태이며 각 유저 행의 `API` 버튼으로 개별 활성화
- **실시간 ingest** — REST API로 새 이벤트를 수신하고 60초 간격으로 자동 갱신
- **관리 페이지** — 로그 직접 입력 및 위치·유저 관리 UI

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

# 4. 샘플 데이터 삽입
docker compose exec backend python scripts/seed.py

# 5. 프론트엔드 접속
open http://localhost:3000
```

> 백엔드 API: `http://localhost:8000`
> API 문서(Swagger): `http://localhost:8000/docs`

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
