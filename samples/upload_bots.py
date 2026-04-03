#!/usr/bin/env python3
"""
Upload 3 bots × 3 days of schedule data from workspace-ut-bots.

Usage:
    python samples/upload_bots.py [--workspace PATH] [--api URL]

Reads IDENTITY.md and HOME.md from each bot workspace to get
user_id, user_name, user_job, location_id, location_name, and timezone.
Then uploads each day's schedules/YYYY-MM-DD.json via POST /api/v1/schedules/batch.

The JSON files use "datetime" field (ISO 8601 with timezone).
"""

import argparse
import json
import re
import sys
from pathlib import Path
import urllib.request
import urllib.error

DEFAULT_WORKSPACE = Path.home() / "Downloads" / "workspace-ut-bots"
DEFAULT_API = "http://localhost:8000"
DATES = ["2026-04-02", "2026-04-03", "2026-04-04"]


def parse_identity(identity_path: Path) -> dict:
    """Extract name and job from IDENTITY.md."""
    text = identity_path.read_text()
    name = re.search(r"\*\*Name:\*\*\s*(.+)", text)
    job = re.search(r"\*\*Job:\*\*\s*(.+)", text)
    return {
        "user_name": name.group(1).strip() if name else None,
        "user_job": job.group(1).strip() if job else None,
    }


def parse_home(home_path: Path) -> dict:
    """Extract locationId, residence_city, residence_type from HOME.md."""
    text = home_path.read_text()
    loc_id = re.search(r"\*\*locationId:\*\*\s*(.+)", text)
    city = re.search(r"\*\*residence_city:\*\*\s*(.+)", text)
    res_type = re.search(r"\*\*residence_type:\*\*\s*(.+)", text)
    return {
        "location_id": loc_id.group(1).strip() if loc_id else None,
        "location_name": f"{city.group(1).strip()} {res_type.group(1).strip()}" if city and res_type else None,
    }


def post_batch(api_url: str, payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{api_url}/api/v1/schedules/batch",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"HTTP {e.code}: {body}") from e


def main():
    parser = argparse.ArgumentParser(description="Upload bot schedules to life-logger API")
    parser.add_argument("--workspace", default=str(DEFAULT_WORKSPACE), help="Path to workspace-ut-bots directory")
    parser.add_argument("--api", default=DEFAULT_API, help="API base URL")
    args = parser.parse_args()

    workspace = Path(args.workspace)
    if not workspace.exists():
        print(f"ERROR: workspace not found: {workspace}", file=sys.stderr)
        sys.exit(1)

    bot_dirs = sorted(workspace.glob("workspace-ut-bot-*"))
    if not bot_dirs:
        print(f"ERROR: no bot directories found in {workspace}", file=sys.stderr)
        sys.exit(1)

    total_created = 0
    total_deleted = 0

    for bot_dir in bot_dirs:
        identity = parse_identity(bot_dir / "IDENTITY.md")
        home = parse_home(bot_dir / "HOME.md")

        print(f"\n{'='*60}")
        print(f"Bot: {identity['user_name']} ({identity['user_job']})")
        print(f"Location: {home['location_name']} [{home['location_id']}]")

        for date_str in DATES:
            schedule_file = bot_dir / "schedules" / f"{date_str}.json"
            if not schedule_file.exists():
                print(f"  [{date_str}] SKIP — file not found")
                continue

            entries = json.loads(schedule_file.read_text())

            # Rename "datetime" field stays as-is (already in new format)
            # Make sure each entry has user_id from the file
            user_id = entries[0].get("user_id") if entries else None
            if not user_id:
                print(f"  [{date_str}] SKIP — no user_id in entries")
                continue

            payload = {
                "entries": entries,
                "replace": True,
                "user_name": identity["user_name"],
                "user_job": identity["user_job"],
                "location_id": home["location_id"],
                "location_name": home["location_name"],
                "timezone": "Asia/Seoul",
            }

            try:
                result = post_batch(args.api, payload)
                print(f"  [{date_str}] OK — created: {result['created']}, deleted: {result['deleted']}")
                total_created += result["created"]
                total_deleted += result["deleted"]
            except RuntimeError as e:
                print(f"  [{date_str}] ERROR — {e}", file=sys.stderr)

    print(f"\n{'='*60}")
    print(f"완료: 총 {total_created}개 생성, {total_deleted}개 교체됨")


if __name__ == "__main__":
    main()
