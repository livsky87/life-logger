"""
Sample seed script - run after docker compose up:
  docker compose exec backend python scripts/seed.py

Household structure:
  김씨네 집  (강남구) — 3명: 김민준, 김서연, 박지은
  이씨네 집  (마포구) — 2명: 이지호, 최수아
  정씨네 집  (서초구) — 1명: 정현우  (1인 가구)
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone

import asyncpg

DB_URL = "postgresql://life_logger:changeme@localhost:5432/life_logger"


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

    # ── Users ──────────────────────────────────────────────────────────────
    # 김씨네 집 (3명)
    minjun = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1,$2,$3) RETURNING id",
        kim_home_id, "김민준", "minjun@example.com",
    )
    seoyeon = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1,$2,$3) RETURNING id",
        kim_home_id, "김서연", "seoyeon@example.com",
    )
    jieun = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1,$2,$3) RETURNING id",
        kim_home_id, "박지은", "jieun@example.com",
    )
    # 이씨네 집 (2명)
    jiho = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1,$2,$3) RETURNING id",
        lee_home_id, "이지호", "jiho@example.com",
    )
    sua = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1,$2,$3) RETURNING id",
        lee_home_id, "최수아", "sua@example.com",
    )
    # 정씨네 집 (1명 — 1인 가구)
    hyunwoo = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1,$2,$3) RETURNING id",
        jung_home_id, "정현우", "hyunwoo@example.com",
    )

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    def ts(h, m=0):
        return today + timedelta(hours=h, minutes=m)

    events = [
        # ── 김민준 (직장인) ────────────────────────────────────────────────
        (minjun, kim_home_id, "location",    "home",            ts(0),      ts(8, 30)),
        (minjun, kim_home_id, "location",    "office",          ts(9),      ts(18)),
        (minjun, kim_home_id, "location",    "home",            ts(18, 30), None),
        (minjun, kim_home_id, "activity",    "sleep",           ts(0),      ts(7)),
        (minjun, kim_home_id, "activity",    "shower",          ts(7, 30),  ts(7, 50)),
        (minjun, kim_home_id, "activity",    "meal",            ts(8),      ts(8, 20)),
        (minjun, kim_home_id, "activity",    "meal",            ts(19),     ts(19, 30)),
        (minjun, kim_home_id, "activity",    "tv",              ts(20),     ts(22)),
        (minjun, kim_home_id, "activity",    "washing_machine", ts(20, 30), ts(22)),
        (minjun, kim_home_id, "api_request", "GET",             ts(9, 15),  None),
        (minjun, kim_home_id, "api_request", "POST",            ts(10, 30), None),
        (minjun, kim_home_id, "api_request", "DELETE",          ts(14, 5),  None),
        (minjun, kim_home_id, "api_request", "GET",             ts(16, 45), None),

        # ── 김서연 (프리랜서, 재택근무) ────────────────────────────────────
        (seoyeon, kim_home_id, "location",    "home",    ts(0),      None),
        (seoyeon, kim_home_id, "activity",    "sleep",   ts(1),      ts(8, 30)),
        (seoyeon, kim_home_id, "activity",    "meal",    ts(9),      ts(9, 30)),
        (seoyeon, kim_home_id, "activity",    "work",    ts(10),     ts(13)),
        (seoyeon, kim_home_id, "activity",    "meal",    ts(13),     ts(13, 30)),
        (seoyeon, kim_home_id, "activity",    "work",    ts(14),     ts(18)),
        (seoyeon, kim_home_id, "activity",    "rest",    ts(18),     ts(19)),
        (seoyeon, kim_home_id, "activity",    "fridge",  ts(9, 5),   None),
        (seoyeon, kim_home_id, "activity",    "fridge",  ts(13, 10), None),
        (seoyeon, kim_home_id, "api_request", "GET",     ts(10, 20), None),
        (seoyeon, kim_home_id, "api_request", "POST",    ts(15, 40), None),

        # ── 박지은 (학생) ──────────────────────────────────────────────────
        (jieun, kim_home_id, "location",    "home",    ts(0),      ts(8, 20)),
        (jieun, kim_home_id, "location",    "outside", ts(8, 30),  ts(16, 30)),
        (jieun, kim_home_id, "location",    "home",    ts(17),     None),
        (jieun, kim_home_id, "activity",    "sleep",   ts(0),      ts(7, 30)),
        (jieun, kim_home_id, "activity",    "meal",    ts(7, 40),  ts(8, 0)),
        (jieun, kim_home_id, "activity",    "meal",    ts(12),     ts(12, 30)),
        (jieun, kim_home_id, "activity",    "meal",    ts(18),     ts(18, 30)),
        (jieun, kim_home_id, "activity",    "rest",    ts(17, 30), ts(19)),
        (jieun, kim_home_id, "activity",    "shower",  ts(17, 0),  ts(17, 20)),

        # ── 이지호 (직장인) ────────────────────────────────────────────────
        (jiho, lee_home_id, "location",    "home",   ts(0),      ts(9)),
        (jiho, lee_home_id, "location",    "office", ts(9, 30),  ts(18, 30)),
        (jiho, lee_home_id, "location",    "home",   ts(19),     None),
        (jiho, lee_home_id, "activity",    "sleep",  ts(1),      ts(7, 30)),
        (jiho, lee_home_id, "activity",    "shower", ts(8),      ts(8, 20)),
        (jiho, lee_home_id, "activity",    "meal",   ts(12),     ts(12, 45)),
        (jiho, lee_home_id, "activity",    "meal",   ts(19, 30), ts(20)),
        (jiho, lee_home_id, "api_request", "GET",    ts(10),     None),
        (jiho, lee_home_id, "api_request", "POST",   ts(11, 20), None),
        (jiho, lee_home_id, "api_request", "PUT",    ts(15, 10), None),
        (jiho, lee_home_id, "api_request", "GET",    ts(17, 30), None),

        # ── 최수아 (카페 아르바이트, 오후 출근) ────────────────────────────
        (sua, lee_home_id, "location",    "home",    ts(0),      ts(13, 30)),
        (sua, lee_home_id, "location",    "outside", ts(14),     ts(21)),
        (sua, lee_home_id, "location",    "home",    ts(21, 30), None),
        (sua, lee_home_id, "activity",    "sleep",   ts(2),      ts(10)),
        (sua, lee_home_id, "activity",    "meal",    ts(10, 30), ts(11)),
        (sua, lee_home_id, "activity",    "shower",  ts(11, 30), ts(11, 50)),
        (sua, lee_home_id, "activity",    "meal",    ts(21, 30), ts(22)),
        (sua, lee_home_id, "activity",    "fridge",  ts(10, 45), None),
        (sua, lee_home_id, "activity",    "fridge",  ts(22, 10), None),

        # ── 정현우 (재택근무 — 1인 가구) ──────────────────────────────────
        (hyunwoo, jung_home_id, "location",    "gym",    ts(6, 30),  ts(7, 45)),
        (hyunwoo, jung_home_id, "location",    "home",   ts(0),      ts(6, 30)),
        (hyunwoo, jung_home_id, "location",    "home",   ts(8),      None),
        (hyunwoo, jung_home_id, "activity",    "sleep",  ts(0),      ts(6, 0)),
        (hyunwoo, jung_home_id, "activity",    "shower", ts(7, 50),  ts(8, 10)),
        (hyunwoo, jung_home_id, "activity",    "meal",   ts(8, 15),  ts(8, 45)),
        (hyunwoo, jung_home_id, "activity",    "work",   ts(9),      ts(12, 30)),
        (hyunwoo, jung_home_id, "activity",    "meal",   ts(12, 30), ts(13)),
        (hyunwoo, jung_home_id, "activity",    "work",   ts(14),     ts(18)),
        (hyunwoo, jung_home_id, "activity",    "rest",   ts(18),     ts(19)),
        (hyunwoo, jung_home_id, "activity",    "fridge", ts(9, 0),   None),
        (hyunwoo, jung_home_id, "activity",    "fridge", ts(12, 45), None),
        (hyunwoo, jung_home_id, "api_request", "GET",    ts(9, 45),  None),
        (hyunwoo, jung_home_id, "api_request", "POST",   ts(11),     None),
        (hyunwoo, jung_home_id, "api_request", "GET",    ts(14, 30), None),
        (hyunwoo, jung_home_id, "api_request", "PUT",    ts(16, 20), None),
    ]

    for user_id, location_id, category, event_type, started_at, ended_at in events:
        data: dict = {}
        if category == "api_request":
            endpoints = ["/api/v1/life-logs", "/api/v1/users", "/api/v1/locations"]
            data = {"endpoint": random.choice(endpoints), "status": 200}
        elif event_type == "fridge":
            data = {"action": "open", "duration_sec": random.randint(5, 60)}

        await conn.execute(
            """INSERT INTO life_logs
                 (user_id, location_id, category, event_type, started_at, ended_at, data)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            user_id, location_id, category, event_type, started_at, ended_at, data,
        )

    await conn.close()
    print("✓ Seed complete")
    print("  Locations : 3")
    print("    김씨네 집 (강남구) — 3명: 김민준, 김서연, 박지은")
    print("    이씨네 집 (마포구) — 2명: 이지호, 최수아")
    print("    정씨네 집 (서초구) — 1명: 정현우")
    print(f"  Events    : {len(events)}")


asyncio.run(main())
