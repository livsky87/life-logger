"""
Sample seed script - run after docker compose up:
  docker compose exec backend python scripts/seed.py

이벤트 타임스탬프는 KST(UTC+9) 기준으로 생성됩니다.
"""
import asyncio
import json
import random
from datetime import datetime, timedelta, timezone

import asyncpg

DB_URL = "postgresql://life_logger:changeme@localhost:5432/life_logger"

KST = timezone(timedelta(hours=9))
API_ENDPOINTS = ["/api/v1/life-logs", "/api/v1/users", "/api/v1/locations", "/api/v1/events"]


def api(method: str, status: int = 200) -> dict:
    return {"endpoint": random.choice(API_ENDPOINTS), "method": method, "status": status}


async def main():
    conn = await asyncpg.connect(DB_URL)

    # ── 5집 생성 (1인 1가구) ──────────────────────────────────────────────────
    loc_rows = [
        ("박씨네 집", "Asia/Seoul", "서울 마포구"),
        ("최씨네 집", "Asia/Seoul", "서울 강남구"),
        ("정씨네 집", "Asia/Seoul", "서울 노원구"),
        ("강씨네 집", "Asia/Seoul", "서울 성동구"),
        ("윤씨네 집", "Asia/Seoul", "서울 관악구"),
    ]
    loc_ids = []
    for name, tz, desc in loc_rows:
        lid = await conn.fetchval(
            "INSERT INTO locations (name, timezone, description) VALUES ($1,$2,$3) RETURNING id",
            name, tz, desc,
        )
        loc_ids.append(lid)

    # ── 5명 생성 (직업 포함) ─────────────────────────────────────────────────
    user_rows = [
        ("박지민", "jimin@example.com",   "소프트웨어 개발자"),
        ("최유나", "yuna@example.com",    "의사"),
        ("정현우", "hyunwoo@example.com", "교사"),
        ("강소희", "sohee@example.com",   "프리랜서 디자이너"),
        ("윤태영", "taeyoung@example.com","야간 경비원"),
    ]
    user_ids = []
    for (name, email, job), loc_id in zip(user_rows, loc_ids):
        uid = await conn.fetchval(
            "INSERT INTO users (location_id, name, email, job) VALUES ($1,$2,$3,$4) RETURNING id",
            loc_id, name, email, job,
        )
        user_ids.append(uid)

    # ── 이벤트 생성 (오늘 + 어제 2일치) ──────────────────────────────────────
    for day_offset in range(2):          # 0=어제, 1=오늘
        today_kst = datetime.now(KST).replace(hour=0, minute=0, second=0, microsecond=0)
        base = today_kst - timedelta(days=1 - day_offset)

        def ts(h: float, m: float = 0) -> datetime:
            total_minutes = int(h * 60 + m)
            return base + timedelta(minutes=total_minutes)

        is_today = day_offset == 1

        # ── 박지민 | 소프트웨어 개발자 (재택근무) ──────────────────────────
        uid, lid = user_ids[0], loc_ids[0]
        events = [
            # 위치: 하루 종일 집
            (uid, lid, "location",    "home",     ts(0),     None),
            # 수면/기상
            (uid, lid, "context",     "sleep",    ts(0),     ts(7, 30)),
            (uid, lid, "context",     "shower",   ts(7, 30), ts(7, 50)),
            (uid, lid, "context",     "meal",     ts(8),     ts(8, 30)),   # 아침
            # 오전 업무
            (uid, lid, "context",     "work",     ts(9),     ts(12, 30)),
            # 점심
            (uid, lid, "context",     "meal",     ts(12, 30),ts(13, 20)),
            # 오후 업무
            (uid, lid, "context",     "work",     ts(14),    ts(18, 30)),
            # 저녁
            (uid, lid, "context",     "meal",     ts(19),    ts(19, 40)),
            (uid, lid, "context",     "rest",     ts(20),    ts(22)),
            # 센서 이벤트
            (uid, lid, "event",       "light",    ts(7, 30), None),
            (uid, lid, "event",       "fridge",   ts(8, 10), None),
            (uid, lid, "event",       "fridge",   ts(13, 30),None),
        ]
        if is_today:
            events += [
                (uid, lid, "api_request", "GET",    ts(9, 20), None),
                (uid, lid, "api_request", "POST",   ts(10, 10),None),
                (uid, lid, "api_request", "GET",    ts(11, 45),None),
                (uid, lid, "api_request", "PUT",    ts(14, 30),None),
                (uid, lid, "api_request", "DELETE", ts(16, 5), None),
                (uid, lid, "api_request", "GET",    ts(17, 50),None),
            ]

        # ── 최유나 | 의사 (병원 출퇴근) ────────────────────────────────────
        uid, lid = user_ids[1], loc_ids[1]
        events += [
            (uid, lid, "location",  "home",      ts(0),     ts(6, 50)),  # 오전 집
            (uid, lid, "location",  "office",    ts(7),     ts(19, 30)), # 병원
            (uid, lid, "location",  "home",      ts(19, 30),None),       # 귀가
            (uid, lid, "context",   "sleep",     ts(0),     ts(5, 50)),
            (uid, lid, "context",   "shower",    ts(5, 50), ts(6, 15)),
            (uid, lid, "context",   "meal",      ts(6, 20), ts(6, 50)),  # 아침
            (uid, lid, "context",   "work",      ts(7, 30), ts(12)),     # 오전 진료
            (uid, lid, "context",   "meal",      ts(12),    ts(12, 40)), # 점심
            (uid, lid, "context",   "work",      ts(13),    ts(19)),     # 오후 진료/수술
            (uid, lid, "context",   "meal",      ts(20),    ts(20, 40)), # 저녁
            (uid, lid, "event",     "light",     ts(5, 50), None),
        ]

        # ── 정현우 | 교사 (학교 출퇴근) ────────────────────────────────────
        uid, lid = user_ids[2], loc_ids[2]
        events += [
            (uid, lid, "location",  "home",      ts(0),     ts(7, 50)),
            (uid, lid, "location",  "office",    ts(8),     ts(17, 20)),
            (uid, lid, "location",  "home",      ts(17, 30),None),
            (uid, lid, "context",   "sleep",     ts(0),     ts(6, 30)),
            (uid, lid, "context",   "meal",      ts(6, 40), ts(7, 10)),  # 아침
            (uid, lid, "context",   "work",      ts(9),     ts(12)),     # 1~4교시
            (uid, lid, "context",   "meal",      ts(12, 10),ts(13)),     # 급식
            (uid, lid, "context",   "work",      ts(13),    ts(16)),     # 5~7교시
            (uid, lid, "context",   "meal",      ts(18),    ts(18, 40)), # 저녁
            (uid, lid, "context",   "rest",      ts(19),    ts(21)),
            (uid, lid, "event",     "light",     ts(6, 30), None),
        ]

        # ── 강소희 | 프리랜서 디자이너 (재택) ──────────────────────────────
        uid, lid = user_ids[3], loc_ids[3]
        events += [
            (uid, lid, "location",  "home",      ts(0),     None),       # 하루 종일 집
            (uid, lid, "context",   "sleep",     ts(0),     ts(10)),     # 늦잠
            (uid, lid, "context",   "meal",      ts(10, 30),ts(11, 10)), # 브런치
            (uid, lid, "context",   "work",      ts(11, 30),ts(14, 30)), # 오전 작업
            (uid, lid, "context",   "rest",      ts(14, 30),ts(15)),     # 낮잠/휴식
            (uid, lid, "context",   "work",      ts(15),    ts(20)),     # 오후 작업
            (uid, lid, "context",   "meal",      ts(20, 30),ts(21, 10)), # 저녁
            (uid, lid, "context",   "video",     ts(21, 30),ts(23, 30)), # 영상 시청
            # 센서 이벤트
            (uid, lid, "event",     "fridge",    ts(10, 20),None),
            (uid, lid, "event",     "fridge",    ts(15, 10),None),
            (uid, lid, "event",     "microwave", ts(10, 35),None),
            (uid, lid, "event",     "light",     ts(10),    None),
            (uid, lid, "event",     "ac_on",     ts(14),    None),
            (uid, lid, "event",     "ac_off",    ts(22),    None),
        ]

        # ── 윤태영 | 야간 경비원 ────────────────────────────────────────────
        uid, lid = user_ids[4], loc_ids[4]
        events += [
            (uid, lid, "location",  "home",      ts(0),     ts(7, 30)),  # 야근 후 귀가
            (uid, lid, "location",  "office",    ts(22),    None),       # 야간 출근
            (uid, lid, "context",   "work",      ts(0),     ts(7)),      # 야간 근무 마무리
            (uid, lid, "context",   "meal",      ts(7, 30), ts(8)),      # 퇴근 후 식사
            (uid, lid, "context",   "sleep",     ts(8, 30), ts(16, 30)), # 낮잠
            (uid, lid, "context",   "meal",      ts(17),    ts(17, 40)), # 저녁
            (uid, lid, "context",   "exercise",  ts(18),    ts(19)),     # 운동
            (uid, lid, "context",   "meal",      ts(20),    ts(20, 30)), # 야식
            (uid, lid, "context",   "rest",      ts(20, 30),ts(21, 30)),
            (uid, lid, "event",     "door",      ts(7, 30), None),       # 귀가 시 현관문
            (uid, lid, "event",     "door",      ts(22),    None),       # 출근 시 현관문
            (uid, lid, "event",     "light",     ts(8, 30), None),
        ]

        for ev_uid, ev_lid, category, event_type, started_at, ended_at in events:
            data: dict = {}
            if category == "api_request":
                data = api(event_type)
            await conn.execute(
                """INSERT INTO life_logs
                   (user_id, location_id, category, event_type, started_at, ended_at, data)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                ev_uid, ev_lid, category, event_type, started_at, ended_at, json.dumps(data),
            )

    await conn.close()
    print(f"✓ Seed complete: {len(user_ids)}명 / {len(loc_ids)}집 / 2일치 데이터")


asyncio.run(main())
