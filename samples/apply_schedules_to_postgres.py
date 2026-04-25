#!/usr/bin/env python3
"""
샘플 home-a / home-b schedules.json을 DB `schedules`에 반영합니다(해당 KST 날·사용자 기존 행은 삭제 후 재삽입).

사용(백엔드·Postgres가 Docker에 있을 때, 예: compose 프로젝트명 life-logger):
  docker cp home-a/schedules.json life-logger_backend_1:/tmp/sched-home-a.json
  docker cp home-b/schedules.json life-logger_backend_1:/tmp/sched-home-b.json
  docker cp apply_schedules_to_postgres.py life-logger_backend_1:/tmp/apply_schedules_to_postgres.py
  docker exec -w /tmp life-logger_backend_1 python apply_schedules_to_postgres.py

또는 호스트에 asyncpg + DATABASE_URL( postgres:// )이 있을 때:
  export DATABASE_URL=postgresql://life_logger:changeme@localhost:5432/life_logger
  python samples/apply_schedules_to_postgres.py

타임라인 기본 날짜가 "오늘"이면 JSON의 4/1·4/2가 화면에 안 보이므로, KST 기준으로 오늘·내일에 맞춰 밀기:
  docker exec -e KST_TODAY=1 -e DATABASE_URL=... -w /tmp life-logger_backend_1 python apply_schedules_to_postgres.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID
from zoneinfo import ZoneInfo

KST = timezone(timedelta(hours=9))
SEOUL = ZoneInfo("Asia/Seoul")

# home-a(출퇴근) → 김민준, home-b(WFH) → 정현우
DEFAULT_USER_BY_HOME = {
    "a": "d963d384-c74b-4d0b-9007-775aa0c2d00e",
    "b": "567320bc-5310-43c6-b134-e6191076db13",
}


def _kst_to_utc(date_int: int, hour: int, minute: int) -> datetime:
    s = str(date_int).zfill(8)
    y, m, d = int(s[:4]), int(s[4:6]), int(s[6:8])
    kst = datetime(y, m, d, hour, minute, 0, tzinfo=KST)
    return kst.astimezone(timezone.utc)


def _normalize_status(raw) -> list:
    if raw is None:
        return []
    if isinstance(raw, str):
        if raw in ("", "normal"):
            return []
        return [raw]
    if isinstance(raw, list):
        return [str(x) for x in raw if x is not None and str(x).strip()]
    return []


def _ymd_to_date(ymd: int) -> date:
    s = str(ymd).zfill(8)
    return date(int(s[:4]), int(s[4:6]), int(s[6:8]))


def _date_to_ymd(d: date) -> int:
    return d.year * 10_000 + d.month * 100 + d.day


def _kst_today_ymd() -> int:
    return int(datetime.now(SEOUL).strftime("%Y%m%d"))


def _shift_entries_to_kst_today(entries: list[dict]) -> list[dict]:
    """
    샘플이 20260401/02 고정이면, KST '오늘'을 1일차에 맞춰 날짜만 밀어 넣는다(2일차 = 오늘+1).
    """
    if not entries:
        return entries
    anchor = min(int(e["date"]) for e in entries)
    base = _ymd_to_date(anchor)
    today = _ymd_to_date(_kst_today_ymd())
    out: list[dict] = []
    for e in entries:
        ed = _ymd_to_date(int(e["date"]))
        delta_days = (ed - base).days
        new_d = today + timedelta(days=delta_days)
        row = deepcopy(e)
        row["date"] = _date_to_ymd(new_d)
        out.append(row)
    return out


def _day_bounds_utc(date_int: int) -> tuple[datetime, datetime]:
    s = str(date_int).zfill(8)
    y, m, d = int(s[:4]), int(s[4:6]), int(s[6:8])
    s_kst = datetime(y, m, d, 0, 0, 0, tzinfo=KST)
    e_kst = s_kst + timedelta(days=1)
    return s_kst.astimezone(timezone.utc), e_kst.astimezone(timezone.utc)


def _get_conn_url() -> str:
    raw = os.environ.get("DATABASE_URL", "")
    if not raw:
        print("DATABASE_URL 이 비어 있습니다.", file=sys.stderr)
        sys.exit(1)
    # postgresql+asyncpg://... → postgresql://...
    return re.sub(r"^postgresql\+[^/]+//", "postgresql://", raw, count=1)


def main() -> None:
    try:
        import asyncpg  # type: ignore
    except ImportError as e:
        print("asyncpg가 필요합니다:", e, file=sys.stderr)
        sys.exit(1)

    base = Path(__file__).resolve().parent
    # Docker /tmp 실행 시 CWD에 json 두 개
    if Path("/tmp/sched-home-a.json").exists() and Path("/tmp/sched-home-b.json").exists():
        paths = {
            "a": Path("/tmp/sched-home-a.json"),
            "b": Path("/tmp/sched-home-b.json"),
        }
    else:
        paths = {
            "a": base / "home-a" / "schedules.json",
            "b": base / "home-b" / "schedules.json",
        }

    url = _get_conn_url()

    async def _run() -> None:
        conn = await asyncpg.connect(url)
        try:
            for key, p in paths.items():
                if not p.is_file():
                    print(f"건너뜀(파일 없음): {p}", file=sys.stderr)
                    continue
                with open(p, encoding="utf-8") as f:
                    entries = json.load(f)
                if not isinstance(entries, list) or not entries:
                    print(f"건너뜀(빈 데이터): {p}", file=sys.stderr)
                    continue
                if os.environ.get("KST_TODAY", "").strip().lower() in ("1", "true", "yes", "y"):
                    entries = _shift_entries_to_kst_today(entries)
                    d0, d1 = min(int(e["date"]) for e in entries), max(int(e["date"]) for e in entries)
                    print(f"  (KST_TODAY) home-{key} → {d0} ~ {d1} (KST)", file=sys.stderr)
                uid = UUID(str(os.environ.get(f"USER_ID_HOME_{key.upper()}", DEFAULT_USER_BY_HOME[key])))
                by_date: dict[int, list[dict]] = defaultdict(list)
                for e in entries:
                    by_date[int(e["date"])].append(e)
                for date_int, day_entries in sorted(by_date.items()):
                    t0, t1 = _day_bounds_utc(date_int)
                    deleted = await conn.execute(
                        """
                        DELETE FROM schedules
                        WHERE user_id = $1::uuid
                          AND timestamp >= $2
                          AND timestamp < $3
                        """,
                        uid,
                        t0,
                        t1,
                    )
                    # executemany이 아닌 execute는 "DELETE 5" 등 문자열만
                    for row in day_entries:
                        hour = int(row.get("hour", 0))
                        minute = int(row.get("minute", 0))
                        ts = _kst_to_utc(int(row["date"]), hour, minute)
                        calls = row.get("calls") or []
                        meta = row.get("metadata") or {}
                        st = _normalize_status(row.get("status"))
                        await conn.execute(
                            """
                            INSERT INTO schedules
                                (user_id, timestamp, description, calls, location, is_home, metadata, status)
                            VALUES
                                ($1::uuid, $2::timestamptz, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb)
                            """,
                            uid,
                            ts,
                            str(row.get("description", "")),
                            json.dumps(calls, ensure_ascii=False),
                            str(row.get("location", "")),
                            bool(row.get("is_home", True)),
                            json.dumps(meta, ensure_ascii=False),
                            json.dumps(st, ensure_ascii=False),
                        )
                    n = len(day_entries)
                    del_msg = (deleted or "").strip() if isinstance(deleted, str) else str(deleted)
                    print(
                        f"ok home-{key} user {uid} date {date_int}: {del_msg} → insert {n}"
                    )
        finally:
            await conn.close()

    import asyncio as _aio

    _aio.run(_run())


if __name__ == "__main__":
    main()
