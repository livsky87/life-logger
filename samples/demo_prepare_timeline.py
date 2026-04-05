#!/usr/bin/env python3
"""
데모: 스케줄을 KST 오늘로 복제한 뒤, 5분마다 observation-heartbeat로 점검 데이터를 쌓습니다.

사전: 백엔드 기동, alembic 적용, 위치(location) UUID 확보.

  # 1) 2026-04-01 KST 스케줄을 오늘 날짜로 복제(오늘 기존 분 삭제)
  python demo_prepare_timeline.py --api http://localhost:8000 --token "$API_ADMIN_TOKEN" \\
    --source-date 20260401 --shift-only

  # 2) 5분마다 GET /health 프로브 → api_observations 적재 (Ctrl+C 종료)
  python demo_prepare_timeline.py --api http://localhost:8000 --token "$API_ADMIN_TOKEN" \\
    --location-id <UUID> --heartbeat-every 300

  # 3) 한 번에: 시프트 + 하트비트 루프
  python demo_prepare_timeline.py --api http://localhost:8000 --token "$API_ADMIN_TOKEN" \\
    --source-date 20260401 --location-id <UUID> --heartbeat-every 300

  # 4) DB가 비어 있어도: 오늘 가짜 스케줄 + 5분 간격 가짜 api_observations 일괄 삽입
  python demo_prepare_timeline.py --api http://localhost:8000 --token "$API_ADMIN_TOKEN" --seed-fake-today
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request


def api_request(
    method: str,
    base_url: str,
    path: str,
    token: str,
    body: dict | None = None,
) -> dict:
    url = f"{base_url.rstrip('/')}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            **({"Content-Type": "application/json"} if body is not None else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"HTTP {e.code}: {err}", file=sys.stderr)
        raise


def main() -> None:
    p = argparse.ArgumentParser(description="Shift schedules to today + observation heartbeat loop")
    p.add_argument("--api", default="http://localhost:8000", help="API base URL")
    p.add_argument("--token", required=True, help="API_ADMIN_TOKEN (Bearer)")
    p.add_argument("--source-date", type=int, default=0, help="YYYYMMDD KST to copy from (0 = skip shift)")
    p.add_argument("--no-replace", action="store_true", help="Do not delete today's schedules before copy")
    p.add_argument("--user-id", default="", help="Only shift this user's schedules")
    p.add_argument("--location-id", default="", help="Location UUID for heartbeat records")
    p.add_argument("--heartbeat-every", type=int, default=0, help="Seconds between heartbeats (0 = no loop)")
    p.add_argument("--shift-only", action="store_true", help="Only run shift, exit")
    p.add_argument(
        "--seed-fake-today",
        action="store_true",
        help="POST /api/v1/demo/seed-fake-today (오늘 가짜 스케줄+점검 데이터)",
    )
    args = p.parse_args()

    if args.seed_fake_today:
        out = api_request(
            "POST",
            args.api,
            "/api/v1/demo/seed-fake-today",
            args.token,
            {
                "replace_schedules": True,
                "seed_schedules": True,
                "seed_observations": True,
                "observation_interval_minutes": 5,
                "observations_full_kst_day": True,
                "assign_observations_to_users": False,
                "create_demo_entities_if_empty": True,
            },
        )
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return

    if args.source_date:
        body: dict = {
            "source_date": args.source_date,
            "replace": not args.no_replace,
        }
        if args.user_id.strip():
            body["user_id"] = args.user_id.strip()
        out = api_request("POST", args.api, "/api/v1/demo/shift-schedules-to-today", args.token, body)
        print(json.dumps(out, indent=2, ensure_ascii=False))

    if args.shift_only:
        return

    loc = args.location_id.strip()
    if not loc:
        if args.heartbeat_every > 0:
            p.error("--location-id is required when --heartbeat-every > 0")
        return

    if args.heartbeat_every <= 0:
        return

    path_hb = f"/api/v1/demo/observation-heartbeat?location_id={loc}"
    print(f"Heartbeat every {args.heartbeat_every}s → GET {path_hb}", file=sys.stderr)
    while True:
        try:
            out = api_request("GET", args.api, path_hb, args.token)
            print(time.strftime("%Y-%m-%d %H:%M:%S"), json.dumps(out, ensure_ascii=False))
        except Exception:
            pass
        time.sleep(args.heartbeat_every)


if __name__ == "__main__":
    main()
