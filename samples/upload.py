#!/usr/bin/env python3
"""
Upload sample schedule data via API.

Usage:
  python upload.py --api http://localhost:8000 --home a --user-id USER_UUID
  python upload.py --api http://localhost:8000 --home b --user-id USER_UUID
  python upload.py --api http://localhost:8000 --home a --list-users
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error


def api_get(base_url: str, path: str) -> dict | list:
    url = f"{base_url}{path}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read())


def api_post(base_url: str, path: str, data: dict) -> dict:
    url = f"{base_url}{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  ❌ HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        raise


def main():
    parser = argparse.ArgumentParser(description="Upload life-logger sample data")
    parser.add_argument("--api", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--home", choices=["a", "b"], required=False, help="Which home to upload (a or b)")
    parser.add_argument("--user-id", default="", help="User UUID to associate schedules with")
    parser.add_argument("--list-users", action="store_true", help="List available users and exit")
    args = parser.parse_args()

    # List users
    if args.list_users:
        print("Available users:")
        users = api_get(args.api, "/api/v1/users")
        for u in users:
            print(f"  {u['id']}  {u['name']}  ({u.get('job', '')})")
        return

    if not args.home:
        parser.error("--home is required unless --list-users is specified")

    home_dir = os.path.join(os.path.dirname(__file__), f"home-{args.home}")
    schedules_file = os.path.join(home_dir, "schedules.json")

    # Upload schedules
    print(f"\n📅 Uploading schedules (home-{args.home})...")
    with open(schedules_file) as f:
        schedules = json.load(f)

    user_id = args.user_id.strip() or None

    # Group by date for progress display
    dates = sorted(set(s["date"] for s in schedules))
    total = 0
    for date in dates:
        day_entries = [s for s in schedules if s["date"] == date]
        for entry in day_entries:
            payload = {**entry}
            if user_id:
                payload["user_id"] = user_id
            try:
                api_post(args.api, "/api/v1/schedules", payload)
                total += 1
            except Exception:
                print(f"  ⚠️  Failed to upload {entry['date']} {entry['hour']:02d}:{entry['minute']:02d}")
        print(f"  ✅ {date}: {len(day_entries)} entries uploaded")

    print(f"\n🎉 Done! {total} schedules uploaded for home-{args.home}")
    if user_id:
        print(f"   User ID: {user_id}")
    print(f"\n👉 View schedule: http://localhost:3000/schedule?userId={user_id or ''}&date={dates[0] if dates else ''}")
    print("👉 Schedule playback: http://localhost:3000/simulation")


if __name__ == "__main__":
    main()
