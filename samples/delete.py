#!/usr/bin/env python3
"""
Delete sample schedule data via API.

Usage:
  python delete.py --api http://localhost:8000 --user-id USER_UUID --date 20260401
  python delete.py --api http://localhost:8000 --user-id USER_UUID --all-dates
"""

import argparse
import json
import sys
import urllib.request
import urllib.error


def api_get(base_url: str, path: str) -> list | dict:
    url = f"{base_url}{path}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read())


def api_delete(base_url: str, path: str) -> bool:
    url = f"{base_url}{path}"
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status == 204
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        print(f"  ❌ HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        raise


def delete_schedules_for_date(base_url: str, date: int, user_id: str | None):
    path = f"/api/v1/schedules?date={date}"
    if user_id:
        path += f"&user_id={user_id}"
    schedules = api_get(base_url, path)
    deleted = 0
    for s in schedules:
        if api_delete(base_url, f"/api/v1/schedules/{s['id']}"):
            deleted += 1
    return deleted


SAMPLE_DATES = [20260401, 20260402, 20260403, 20260404, 20260405, 20260406, 20260407]


def main():
    parser = argparse.ArgumentParser(description="Delete life-logger sample data")
    parser.add_argument("--api", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--user-id", default="", help="User UUID whose schedules to delete")
    parser.add_argument("--date", type=int, help="Specific date (YYYYMMDD) to delete schedules for")
    parser.add_argument("--all-dates", action="store_true", help="Delete schedules for all sample dates")
    args = parser.parse_args()

    user_id = args.user_id.strip() or None

    if args.date:
        print(f"\n🗑️  Deleting schedules for date={args.date} (user={user_id or 'all'})...")
        count = delete_schedules_for_date(args.api, args.date, user_id)
        print(f"  ✅ {count} entries deleted")

    if args.all_dates:
        print(f"\n🗑️  Deleting all sample schedules (user={user_id or 'all'})...")
        total = 0
        for date in SAMPLE_DATES:
            count = delete_schedules_for_date(args.api, date, user_id)
            if count:
                print(f"  ✅ {date}: {count} entries deleted")
            total += count
        print(f"\n🎉 Done! {total} schedules deleted total")

    if not any([args.date, args.all_dates]):
        parser.print_help()


if __name__ == "__main__":
    main()
