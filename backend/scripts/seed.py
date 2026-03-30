"""
Sample seed script - run after docker compose up:
  docker compose exec backend python scripts/seed.py

Household structure:
  김씨네 집  (강남구) — 3명: 김민준(직장인), 김서연(프리랜서), 박지은(대학생)
  이씨네 집  (마포구) — 2명: 이지호(직장인), 최수아(카페 알바)
  정씨네 집  (서초구) — 1명: 정현우(재택근무, 1인 가구)

모든 시간은 Asia/Seoul(UTC+9) 기준으로 입력합니다.
ts(h, m) → 오늘 서울 자정 + h시간 m분
ts(-1)   → 어제 서울 23:00  (수면 시작 등 자정 이전 이벤트)
"""
import asyncio
import json
import os
import random
from datetime import datetime, timedelta, timezone

import asyncpg

DB_URL = os.getenv("DATABASE_URL", "postgresql://life_logger:changeme@localhost:5432/life_logger").replace("+asyncpg", "")

SEOUL = timezone(timedelta(hours=9))

API_ENDPOINTS = ["/api/v1/life-logs", "/api/v1/users", "/api/v1/locations", "/api/v1/events"]


async def main():
    conn = await asyncpg.connect(DB_URL)

    # ── Locations ──────────────────────────────────────────────────────────
    kim_home_id = await conn.fetchval(
        "INSERT INTO locations (name, timezone, description) VALUES ($1,$2,$3) RETURNING id",
        "김씨네 집", "Asia/Seoul", "서울 강남구",
    )
    lee_home_id = await conn.fetchval(
        "INSERT INTO locations (name, timezone, description) VALUES ($1,$2,$3) RETURNING id",
        "이씨네 집", "Asia/Seoul", "서울 마포구",
    )
    jung_home_id = await conn.fetchval(
        "INSERT INTO locations (name, timezone, description) VALUES ($1,$2,$3) RETURNING id",
        "정씨네 집", "Asia/Seoul", "서울 서초구",
    )

    # ── Users (job 컬럼 포함) ───────────────────────────────────────────────
    minjun = await conn.fetchval(
        "INSERT INTO users (location_id, name, email, job) VALUES ($1,$2,$3,$4) RETURNING id",
        kim_home_id, "김민준", "minjun@example.com", "소프트웨어 엔지니어",
    )
    seoyeon = await conn.fetchval(
        "INSERT INTO users (location_id, name, email, job) VALUES ($1,$2,$3,$4) RETURNING id",
        kim_home_id, "김서연", "seoyeon@example.com", "프리랜서 디자이너",
    )
    jieun = await conn.fetchval(
        "INSERT INTO users (location_id, name, email, job) VALUES ($1,$2,$3,$4) RETURNING id",
        kim_home_id, "박지은", "jieun@example.com", "대학생",
    )
    jiho = await conn.fetchval(
        "INSERT INTO users (location_id, name, email, job) VALUES ($1,$2,$3,$4) RETURNING id",
        lee_home_id, "이지호", "jiho@example.com", "마케터",
    )
    sua = await conn.fetchval(
        "INSERT INTO users (location_id, name, email, job) VALUES ($1,$2,$3,$4) RETURNING id",
        lee_home_id, "최수아", "sua@example.com", "카페 아르바이트",
    )
    hyunwoo = await conn.fetchval(
        "INSERT INTO users (location_id, name, email, job) VALUES ($1,$2,$3,$4) RETURNING id",
        jung_home_id, "정현우", "hyunwoo@example.com", "재택근무 개발자",
    )

    # 오늘 서울 자정 (UTC 기준으로 저장)
    today = datetime.now(SEOUL).replace(hour=0, minute=0, second=0, microsecond=0)

    def ts(h, m=0):
        """서울 시간 기준 오늘 자정에서 h시간 m분 후. 음수면 전날로 거슬러 올라감."""
        return today + timedelta(hours=h, minutes=m)

    events = [
        # ── 김민준 (소프트웨어 엔지니어, 출근) ───────────────────────────────
        # 수면: 23:30(전날) ~ 07:00
        (minjun, kim_home_id, "activity",    "sleep",           ts(-0, 30),  ts(7)),
        (minjun, kim_home_id, "activity",    "shower",          ts(7, 10),   ts(7, 30)),
        (minjun, kim_home_id, "activity",    "meal",            ts(7, 35),   ts(7, 55)),   # 아침
        (minjun, kim_home_id, "location",    "home",            ts(0),       ts(8, 40)),
        (minjun, kim_home_id, "location",    "office",          ts(9),       ts(18)),
        (minjun, kim_home_id, "location",    "home",            ts(18, 20),  None),
        (minjun, kim_home_id, "activity",    "meal",            ts(12, 0),   ts(12, 40)),  # 점심
        (minjun, kim_home_id, "activity",    "meal",            ts(19, 0),   ts(19, 30)),  # 저녁
        (minjun, kim_home_id, "activity",    "tv",              ts(20, 0),   ts(21, 30)),
        (minjun, kim_home_id, "activity",    "washing_machine", ts(20, 30),  ts(22, 0)),
        (minjun, kim_home_id, "api_request", "GET",             ts(9, 15),   None),
        (minjun, kim_home_id, "api_request", "POST",            ts(10, 42),  None),
        (minjun, kim_home_id, "api_request", "GET",             ts(13, 5),   None),
        (minjun, kim_home_id, "api_request", "DELETE",          ts(14, 33),  None),
        (minjun, kim_home_id, "api_request", "GET",             ts(16, 50),  None),

        # ── 김서연 (프리랜서 디자이너, 재택) ─────────────────────────────────
        # 수면: 01:00 ~ 09:00 (늦게 자고 늦게 일어남)
        (seoyeon, kim_home_id, "activity",    "sleep",   ts(1),       ts(9)),
        (seoyeon, kim_home_id, "location",    "home",    ts(0),       None),
        (seoyeon, kim_home_id, "activity",    "meal",    ts(9, 20),   ts(9, 50)),           # 아침 겸 점심
        (seoyeon, kim_home_id, "activity",    "work",    ts(10, 30),  ts(13, 0)),
        (seoyeon, kim_home_id, "activity",    "meal",    ts(13, 10),  ts(13, 40)),
        (seoyeon, kim_home_id, "activity",    "work",    ts(14, 0),   ts(18, 30)),
        (seoyeon, kim_home_id, "activity",    "rest",    ts(18, 30),  ts(19, 30)),
        (seoyeon, kim_home_id, "activity",    "meal",    ts(19, 30),  ts(20, 0)),           # 저녁
        (seoyeon, kim_home_id, "activity",    "fridge",  ts(9, 25),   None),
        (seoyeon, kim_home_id, "activity",    "fridge",  ts(13, 15),  None),
        (seoyeon, kim_home_id, "activity",    "fridge",  ts(19, 35),  None),
        (seoyeon, kim_home_id, "api_request", "GET",     ts(10, 55),  None),
        (seoyeon, kim_home_id, "api_request", "POST",    ts(15, 20),  None),

        # ── 박지은 (대학생) ────────────────────────────────────────────────
        # 수면: 00:30 ~ 07:30
        (jieun, kim_home_id, "activity",    "sleep",   ts(0, 30),   ts(7, 30)),
        (jieun, kim_home_id, "activity",    "meal",    ts(7, 40),   ts(8, 5)),             # 아침
        (jieun, kim_home_id, "location",    "home",    ts(0),       ts(8, 30)),
        (jieun, kim_home_id, "location",    "outside", ts(8, 30),   ts(17, 0)),            # 학교
        (jieun, kim_home_id, "location",    "home",    ts(17, 10),  None),
        (jieun, kim_home_id, "activity",    "meal",    ts(12, 20),  ts(12, 50)),           # 점심 (학교)
        (jieun, kim_home_id, "activity",    "shower",  ts(17, 20),  ts(17, 40)),
        (jieun, kim_home_id, "activity",    "meal",    ts(18, 10),  ts(18, 40)),           # 저녁
        (jieun, kim_home_id, "activity",    "rest",    ts(19, 0),   ts(20, 30)),
        (jieun, kim_home_id, "activity",    "fridge",  ts(7, 42),   None),
        (jieun, kim_home_id, "activity",    "fridge",  ts(18, 12),  None),

        # ── 이지호 (마케터, 출근) ─────────────────────────────────────────
        # 수면: 23:30(전날) ~ 07:00
        (jiho, lee_home_id, "activity",    "sleep",  ts(-0, 30),  ts(7, 0)),
        (jiho, lee_home_id, "activity",    "shower", ts(7, 10),   ts(7, 30)),
        (jiho, lee_home_id, "activity",    "meal",   ts(7, 35),   ts(8, 0)),              # 아침
        (jiho, lee_home_id, "location",    "home",   ts(0),       ts(8, 50)),
        (jiho, lee_home_id, "location",    "office", ts(9, 20),   ts(18, 30)),
        (jiho, lee_home_id, "location",    "home",   ts(19, 0),   None),
        (jiho, lee_home_id, "activity",    "meal",   ts(12, 10),  ts(12, 55)),            # 점심
        (jiho, lee_home_id, "activity",    "meal",   ts(19, 30),  ts(20, 10)),            # 저녁
        (jiho, lee_home_id, "activity",    "tv",     ts(20, 30),  ts(22, 0)),
        (jiho, lee_home_id, "api_request", "POST",   ts(9, 40),   None),
        (jiho, lee_home_id, "api_request", "GET",    ts(11, 15),  None),
        (jiho, lee_home_id, "api_request", "PUT",    ts(14, 50),  None),
        (jiho, lee_home_id, "api_request", "GET",    ts(17, 20),  None),

        # ── 최수아 (카페 아르바이트, 오후 출근) ──────────────────────────────
        # 수면: 02:00 ~ 10:30 (야간 근무 후 늦잠)
        (sua, lee_home_id, "activity",    "sleep",   ts(2, 0),    ts(10, 30)),
        (sua, lee_home_id, "location",    "home",    ts(0),       ts(13, 0)),
        (sua, lee_home_id, "location",    "outside", ts(13, 0),   ts(21, 30)),            # 카페 출근
        (sua, lee_home_id, "location",    "home",    ts(21, 30),  None),
        (sua, lee_home_id, "activity",    "meal",    ts(11, 0),   ts(11, 30)),            # 아침 겸 점심
        (sua, lee_home_id, "activity",    "shower",  ts(11, 45),  ts(12, 5)),
        (sua, lee_home_id, "activity",    "meal",    ts(16, 30),  ts(17, 0)),             # 카페에서 간식
        (sua, lee_home_id, "activity",    "meal",    ts(22, 0),   ts(22, 30)),            # 야식
        (sua, lee_home_id, "activity",    "fridge",  ts(11, 5),   None),
        (sua, lee_home_id, "activity",    "fridge",  ts(22, 5),   None),

        # ── 정현우 (재택근무 개발자, 1인 가구) ───────────────────────────────
        # 수면: 00:00 ~ 06:30
        (hyunwoo, jung_home_id, "activity",    "sleep",  ts(0),       ts(6, 30)),
        (hyunwoo, jung_home_id, "location",    "home",   ts(0),       ts(7, 0)),
        (hyunwoo, jung_home_id, "location",    "gym",    ts(7, 0),    ts(8, 0)),           # 헬스장
        (hyunwoo, jung_home_id, "location",    "home",   ts(8, 10),   None),
        (hyunwoo, jung_home_id, "activity",    "shower", ts(8, 0),    ts(8, 20)),
        (hyunwoo, jung_home_id, "activity",    "meal",   ts(8, 25),   ts(8, 50)),          # 아침
        (hyunwoo, jung_home_id, "activity",    "work",   ts(9, 0),    ts(12, 30)),
        (hyunwoo, jung_home_id, "activity",    "meal",   ts(12, 30),  ts(13, 10)),         # 점심
        (hyunwoo, jung_home_id, "activity",    "work",   ts(14, 0),   ts(18, 0)),
        (hyunwoo, jung_home_id, "activity",    "rest",   ts(18, 0),   ts(19, 0)),
        (hyunwoo, jung_home_id, "activity",    "meal",   ts(19, 0),   ts(19, 40)),         # 저녁
        (hyunwoo, jung_home_id, "activity",    "fridge", ts(8, 30),   None),
        (hyunwoo, jung_home_id, "activity",    "fridge", ts(12, 35),  None),
        (hyunwoo, jung_home_id, "activity",    "fridge", ts(19, 5),   None),
        (hyunwoo, jung_home_id, "api_request", "GET",    ts(9, 30),   None),
        (hyunwoo, jung_home_id, "api_request", "POST",   ts(10, 55),  None),
        (hyunwoo, jung_home_id, "api_request", "GET",    ts(14, 20),  None),
        (hyunwoo, jung_home_id, "api_request", "PUT",    ts(16, 45),  None),
        (hyunwoo, jung_home_id, "api_request", "DELETE", ts(17, 30),  None),
    ]

    statuses = [200, 200, 200, 200, 201, 204, 400, 404, 500]

    for user_id, location_id, category, event_type, started_at, ended_at in events:
        data: dict = {}
        if category == "api_request":
            endpoints = ["/api/v1/life-logs", "/api/v1/users", "/api/v1/locations"]
            data = {
                "endpoint": random.choice(endpoints),
                "status": random.choices(statuses, weights=[40, 10, 10, 10, 5, 5, 8, 7, 5])[0],
                "method": event_type,
            }
        elif event_type == "fridge":
            data = {"action": "open", "duration_sec": random.randint(5, 60)}
        elif event_type == "washing_machine":
            data = {"cycle": random.choice(["표준", "삶음", "울세탁"])}

        await conn.execute(
            """INSERT INTO life_logs
                 (user_id, location_id, category, event_type, started_at, ended_at, data)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            user_id, location_id, category, event_type, started_at, ended_at, json.dumps(data),
        )

    await conn.close()
    print("✓ Seed complete")
    print("  Locations : 3")
    print("    김씨네 집 (강남구) — 3명: 김민준, 김서연, 박지은")
    print("    이씨네 집 (마포구) — 2명: 이지호, 최수아")
    print("    정씨네 집 (서초구) — 1명: 정현우")
    print(f"  Events    : {len(events)}")


asyncio.run(main())
