"""
이벤트 삭제 테스트 스크립트.

사용법:

  # ID로 삭제
  python scripts/test_delete.py --id 42
  python scripts/test_delete.py --id 10 20 30

  # 유저 + 날짜 범위로 삭제
  python scripts/test_delete.py --user "김민준" --date 2026-03-31

  # 전체 데이터 초기화 (locations/users/life_logs 모두)
  python scripts/test_delete.py --truncate

  # 특정 날짜의 life_logs만 삭제
  python scripts/test_delete.py --date 2026-03-31

옵션:
  --id        삭제할 life_log id (여러 개 가능)
  --user      유저 이름 (부분 일치)
  --date      YYYY-MM-DD 형식 날짜 (Seoul 기준)
  --truncate  전체 초기화 (locations, users, life_logs)
  --yes       확인 프롬프트 생략
"""
import argparse
import asyncio
import os
from datetime import datetime, timedelta, timezone

import asyncpg

DB_URL = os.getenv("DATABASE_URL", "postgresql://life_logger:changeme@localhost:5432/life_logger").replace("+asyncpg", "")
SEOUL = timezone(timedelta(hours=9))


async def main():
    parser = argparse.ArgumentParser(description="이벤트 삭제")
    parser.add_argument("--id",       type=int, nargs="+", help="삭제할 life_log id")
    parser.add_argument("--user",     default=None, help="유저 이름 (부분 일치)")
    parser.add_argument("--date",     default=None, help="날짜 YYYY-MM-DD (Seoul 기준)")
    parser.add_argument("--truncate", action="store_true", help="전체 초기화")
    parser.add_argument("--yes",      action="store_true", help="확인 프롬프트 생략")
    args = parser.parse_args()

    conn = await asyncpg.connect(DB_URL)

    # ── 전체 초기화 ─────────────────────────────────────────────────────────
    if args.truncate:
        if not args.yes:
            answer = input("⚠  전체 데이터를 삭제합니다. 계속하시겠습니까? [y/N] ").strip().lower()
            if answer != "y":
                print("취소했습니다.")
                await conn.close()
                return
        await conn.execute("TRUNCATE life_logs, users, locations RESTART IDENTITY CASCADE")
        print("✓ 전체 초기화 완료 (life_logs, users, locations)")
        await conn.close()
        return

    # ── ID 지정 삭제 ─────────────────────────────────────────────────────────
    if args.id:
        result = await conn.execute(
            "DELETE FROM life_logs WHERE id = ANY($1::bigint[])", args.id
        )
        count = int(result.split()[-1])
        print(f"✓ {count}건 삭제 (id: {args.id})")
        await conn.close()
        return

    # ── 유저 + 날짜 범위 삭제 ───────────────────────────────────────────────
    conditions = []
    values = []

    if args.user:
        row = await conn.fetchrow(
            "SELECT id, name FROM users WHERE name LIKE $1 LIMIT 1", f"%{args.user}%"
        )
        if not row:
            print(f"✗ 유저를 찾을 수 없습니다: {args.user}")
            await conn.close()
            return
        values.append(row["id"])
        conditions.append(f"user_id = ${len(values)}")
        print(f"  대상 유저: {row['name']}")

    if args.date:
        day = datetime.strptime(args.date, "%Y-%m-%d").replace(tzinfo=SEOUL)
        day_end = day + timedelta(days=1)
        values.append(day)
        conditions.append(f"started_at >= ${len(values)}")
        values.append(day_end)
        conditions.append(f"started_at < ${len(values)}")
        print(f"  날짜 범위: {day.date()} (Seoul 기준)")

    if not conditions:
        print("✗ 삭제 조건을 지정하세요. --id, --user, --date, --truncate 중 하나 이상 필요합니다.")
        await conn.close()
        return

    # 삭제 전 미리보기
    preview = await conn.fetch(
        f"SELECT id, category, event_type, started_at FROM life_logs WHERE {' AND '.join(conditions)} ORDER BY started_at LIMIT 10",
        *values,
    )
    count_total = await conn.fetchval(
        f"SELECT COUNT(*) FROM life_logs WHERE {' AND '.join(conditions)}", *values
    )

    print(f"\n삭제 대상: {count_total}건")
    for r in preview[:5]:
        print(f"  id={r['id']}  {r['category']}/{r['event_type']}  {r['started_at'].astimezone(SEOUL).strftime('%m-%d %H:%M')}")
    if count_total > 5:
        print(f"  ... 외 {count_total - 5}건")

    if not args.yes:
        answer = input(f"\n{count_total}건을 삭제합니다. 계속하시겠습니까? [y/N] ").strip().lower()
        if answer != "y":
            print("취소했습니다.")
            await conn.close()
            return

    result = await conn.execute(
        f"DELETE FROM life_logs WHERE {' AND '.join(conditions)}", *values
    )
    deleted = int(result.split()[-1])
    print(f"✓ {deleted}건 삭제 완료")
    await conn.close()


asyncio.run(main())
