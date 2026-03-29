"""
Sample seed script - run after docker compose up:
  docker compose exec backend python scripts/seed.py
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone

import asyncpg

DB_URL = "postgresql://life_logger:changeme@localhost:5432/life_logger"


async def main():
    conn = await asyncpg.connect(DB_URL)

    # Locations
    home_id = await conn.fetchval(
        "INSERT INTO locations (name, timezone, description) VALUES ($1, $2, $3) RETURNING id",
        "김씨네 집", "Asia/Seoul", "서울 강남구",
    )
    office_id = await conn.fetchval(
        "INSERT INTO locations (name, timezone, description) VALUES ($1, $2, $3) RETURNING id",
        "이씨네 집", "Asia/Seoul", "서울 마포구",
    )

    # Users
    alice = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1, $2, $3) RETURNING id",
        home_id, "김민준", "minjun@example.com",
    )
    bob = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1, $2, $3) RETURNING id",
        home_id, "김서연", "seoyeon@example.com",
    )
    charlie = await conn.fetchval(
        "INSERT INTO users (location_id, name, email) VALUES ($1, $2, $3) RETURNING id",
        office_id, "이지호", "jiho@example.com",
    )

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    def ts(h, m=0):
        return today + timedelta(hours=h, minutes=m)

    events = [
        # 김민준 - location events
        (alice, home_id, "location", "home",   ts(0),   ts(8, 30)),
        (alice, home_id, "location", "office", ts(9),   ts(18)),
        (alice, home_id, "location", "home",   ts(18, 30), None),
        # 김민준 - activities
        (alice, home_id, "activity", "sleep",           ts(0), ts(7)),
        (alice, home_id, "activity", "shower",          ts(7, 30), ts(7, 50)),
        (alice, home_id, "activity", "meal",            ts(8), ts(8, 20)),
        (alice, home_id, "activity", "tv",              ts(19), ts(21)),
        (alice, home_id, "activity", "washing_machine", ts(20), ts(21, 30)),
        # 김민준 - api requests
        (alice, home_id, "api_request", "GET",    ts(9, 15), None),
        (alice, home_id, "api_request", "POST",   ts(10, 30), None),
        (alice, home_id, "api_request", "DELETE", ts(14, 5), None),
        (alice, home_id, "api_request", "GET",    ts(16, 45), None),
        # 김서연
        (bob, home_id, "location", "home",  ts(0), ts(10)),
        (bob, home_id, "location", "gym",   ts(10), ts(11, 30)),
        (bob, home_id, "location", "home",  ts(12), None),
        (bob, home_id, "activity", "sleep",  ts(0), ts(8)),
        (bob, home_id, "activity", "meal",   ts(8, 30), ts(9)),
        (bob, home_id, "activity", "fridge", ts(9, 10), None),
        (bob, home_id, "activity", "fridge", ts(12, 30), None),
        (bob, home_id, "activity", "meal",   ts(13), ts(13, 30)),
        # 이지호
        (charlie, office_id, "location", "home",   ts(0), ts(9)),
        (charlie, office_id, "location", "office", ts(9, 30), ts(18, 30)),
        (charlie, office_id, "location", "home",   ts(19), None),
        (charlie, office_id, "activity", "sleep",  ts(1), ts(7, 30)),
        (charlie, office_id, "activity", "meal",   ts(12), ts(12, 45)),
        (charlie, office_id, "api_request", "GET",  ts(10), None),
        (charlie, office_id, "api_request", "POST", ts(11, 20), None),
        (charlie, office_id, "api_request", "PUT",  ts(15, 10), None),
        (charlie, office_id, "api_request", "GET",  ts(17, 30), None),
    ]

    for user_id, location_id, category, event_type, started_at, ended_at in events:
        data = {}
        if event_type == "api_request":
            endpoints = ["/api/v1/life-logs", "/api/v1/users", "/api/v1/locations"]
            data = {"endpoint": random.choice(endpoints), "status": 200}
        elif event_type == "fridge":
            data = {"action": "open", "duration_sec": random.randint(5, 60)}

        await conn.execute(
            """INSERT INTO life_logs (user_id, location_id, category, event_type, started_at, ended_at, data)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            user_id, location_id, category, event_type, started_at, ended_at, data,
        )

    await conn.close()
    print("✓ Seed complete")


asyncio.run(main())
