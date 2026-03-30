"""
단건 이벤트 삽입 테스트 스크립트.

사용법 (docker compose exec backend python scripts/test_insert.py --help):

  # 특정 유저에게 이벤트 한 건 삽입 (user_id 자동 조회 or 직접 지정)
  python scripts/test_insert.py --user "김민준" --category activity --type sleep --start "2026-03-31 23:00" --end "2026-04-01 07:00"
  python scripts/test_insert.py --user "정현우" --category api_request --type GET
  python scripts/test_insert.py --user "이지호" --category activity --type meal --minutes-ago 30 --duration 40

옵션:
  --user        유저 이름 (부분 일치)
  --category    location | activity | api_request | event | context
  --type        event_type 값 (sleep, meal, shower, GET, POST, ...)
  --start       시작 시각 "YYYY-MM-DD HH:MM" (기본: 지금)
  --end         종료 시각 "YYYY-MM-DD HH:MM" (기본: None)
  --minutes-ago 지금으로부터 N분 전을 start로 사용
  --duration    분 단위 지속시간 → end = start + duration
  --data        JSON 문자열 (기본: {})
"""
import argparse
import asyncio
import json
import os
from datetime import datetime, timedelta, timezone

import asyncpg

DB_URL = os.getenv("DATABASE_URL", "postgresql://life_logger:changeme@localhost:5432/life_logger").replace("+asyncpg", "")
SEOUL = timezone(timedelta(hours=9))


async def main():
    parser = argparse.ArgumentParser(description="단건 이벤트 삽입")
    parser.add_argument("--user",        required=True, help="유저 이름 (부분 일치)")
    parser.add_argument("--category",    required=True, choices=["location", "activity", "api_request", "event", "context"])
    parser.add_argument("--type",        required=True, dest="event_type", help="event_type 값")
    parser.add_argument("--start",       default=None, help="시작 시각 'YYYY-MM-DD HH:MM' (Seoul 기준)")
    parser.add_argument("--end",         default=None, help="종료 시각 'YYYY-MM-DD HH:MM' (Seoul 기준)")
    parser.add_argument("--minutes-ago", type=int, default=None, dest="minutes_ago", help="N분 전을 start로")
    parser.add_argument("--duration",    type=int, default=None, help="지속 분 수 (end = start + duration)")
    parser.add_argument("--data",        default="{}", help="추가 JSON 데이터")
    args = parser.parse_args()

    conn = await asyncpg.connect(DB_URL)

    # 유저 조회
    row = await conn.fetchrow(
        "SELECT u.id, u.name, u.location_id FROM users u WHERE u.name LIKE $1 LIMIT 1",
        f"%{args.user}%",
    )
    if not row:
        print(f"✗ 유저를 찾을 수 없습니다: {args.user}")
        await conn.close()
        return

    user_id, user_name, location_id = row["id"], row["name"], row["location_id"]

    # 시각 처리
    now = datetime.now(SEOUL)
    if args.minutes_ago is not None:
        started_at = now - timedelta(minutes=args.minutes_ago)
    elif args.start:
        started_at = datetime.strptime(args.start, "%Y-%m-%d %H:%M").replace(tzinfo=SEOUL)
    else:
        started_at = now

    ended_at = None
    if args.duration is not None:
        ended_at = started_at + timedelta(minutes=args.duration)
    elif args.end:
        ended_at = datetime.strptime(args.end, "%Y-%m-%d %H:%M").replace(tzinfo=SEOUL)

    data = json.loads(args.data)

    # 삽입
    log_id = await conn.fetchval(
        """INSERT INTO life_logs (user_id, location_id, category, event_type, started_at, ended_at, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id""",
        user_id, location_id, args.category, args.event_type,
        started_at, ended_at, json.dumps(data),
    )

    await conn.close()

    end_str = ended_at.strftime("%H:%M") if ended_at else "진행 중"
    print(f"✓ 삽입 완료 (id={log_id})")
    print(f"  유저    : {user_name}")
    print(f"  카테고리: {args.category} / {args.event_type}")
    print(f"  시각    : {started_at.strftime('%Y-%m-%d %H:%M')} ~ {end_str} (Seoul)")
    print(f"  데이터  : {json.dumps(data, ensure_ascii=False)}")


asyncio.run(main())
