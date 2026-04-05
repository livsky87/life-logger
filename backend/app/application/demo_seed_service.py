"""데모용: 스케줄 날짜 이동·API 점검 하트비·가짜 오늘 데이터 시드."""

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

import httpx

from app.application.api_observation_service import ApiObservationService
from app.application.location_service import LocationService
from app.application.schedule_service import ScheduleService
from app.application.user_service import UserService

KST = timezone(timedelta(hours=9))

CHUNK = 400
OBS_BATCH = 200

# (hour, minute, location, description, is_home, calls, status_tags)
_FAKE_SCHEDULE_DAY: list[tuple[int, int, str, str, bool, list, list[str]]] = [
    (7, 0, "침실", "[가짜] 기상", True, [], ["수면"]),
    (
        7,
        10,
        "화장실",
        "[가짜] 세면",
        True,
        [
            {
                "method": "POST",
                "url": "/v1/devices/light-bathroom-a/commands",
                "deviceId": "light-bathroom-a",
                "commands": [{"capability": "switch", "command": "on"}],
                "dsec": 0,
                "result": "200 OK",
            }
        ],
        ["요리"],
    ),
    (
        7,
        40,
        "부엌",
        "[가짜] 아침 준비",
        True,
        [
            {
                "method": "POST",
                "url": "/v1/devices/light-kitchen-a/commands",
                "deviceId": "light-kitchen-a",
                "commands": [],
                "dsec": 3,
                "result": "success",
            }
        ],
        ["요리"],
    ),
    (8, 0, "부엌", "[가짜] 아침식사", True, [], []),
    (
        8,
        30,
        "거실",
        "[가짜] 뉴스",
        True,
        [
            {
                "method": "POST",
                "url": "/v1/devices/tv-a-001/commands",
                "deviceId": "tv-a-001",
                "commands": [],
                "dsec": 5,
                "result": None,
            }
        ],
        [],
    ),
    (
        9,
        15,
        "집 밖",
        "[가짜] 출근",
        False,
        [],
        [],
    ),
    (12, 30, "집 밖", "[가짜] 점심", False, [], []),
    (18, 30, "집 밖", "[가짜] 퇴근", False, [], []),
    (
        19,
        30,
        "부엌",
        "[가짜] 저녁 준비",
        True,
        [],
        ["요리"],
    ),
    (20, 0, "부엌", "[가짜] 저녁식사", True, [], ["요리"]),
    (
        20,
        30,
        "거실",
        "[가짜] TV",
        True,
        [],
        [],
    ),
    (22, 30, "베란다", "[가짜] 세탁", True, [], []),
    (23, 0, "침실", "[가짜] 취침 준비", True, [], ["수면"]),
    (23, 30, "침실", "[가짜] 취침", True, [], ["수면"]),
]

# (outcome, http_status, detail, description) — 가짜 API 점검 패턴 순환
_FAKE_OBS_PATTERN: list[tuple[str, int | None, str, str]] = [
    ("success", 200, "GET /api/v1/locations", "가짜: 목록 조회 성공"),
    ("success", 200, "GET /api/v1/users", "가짜: 사용자 목록"),
    ("warning", 429, "POST /api/v1/life-logs", "가짜: rate limit"),
    ("success", 201, "POST /api/v1/schedules", "가짜: 스케줄 생성"),
    ("failure", 503, "GET /api/v1/fake/upstream", "가짜: upstream timeout"),
    ("failure", None, "GET /api/v1/fake/circuit", "가짜: 연결 실패(시뮬)"),
    ("warning", 404, "GET /api/v1/fake/legacy", "가짜: 리소스 없음"),
]


def _kst_day_range_utc(date_int: int, days: int = 1) -> tuple[datetime, datetime]:
    s = str(date_int).zfill(8)
    day_start_kst = datetime(int(s[:4]), int(s[4:6]), int(s[6:8]), 0, 0, 0, tzinfo=KST)
    day_end_kst = day_start_kst + timedelta(days=days)
    return day_start_kst.astimezone(timezone.utc), day_end_kst.astimezone(timezone.utc)


def _today_kst_yyyymmdd() -> int:
    d = datetime.now(timezone.utc).astimezone(KST).date()
    return int(d.strftime("%Y%m%d"))


def _kst_today_at(hour: int, minute: int) -> datetime:
    """UTC aware instant for KST wall time today."""
    d = datetime.now(timezone.utc).astimezone(KST).date()
    kst = datetime(d.year, d.month, d.day, hour, minute, 0, tzinfo=KST)
    return kst.astimezone(timezone.utc)


class DemoSeedService:
    def __init__(
        self,
        schedule_service: ScheduleService,
        observation_service: ApiObservationService,
        user_service: UserService,
        location_service: LocationService,
    ) -> None:
        self._schedules = schedule_service
        self._observations = observation_service
        self._users = user_service
        self._locations = location_service

    async def shift_schedules_to_today(
        self,
        source_date_int: int,
        *,
        replace: bool,
        user_id: UUID | None,
    ) -> dict:
        """
        KST source_date 하루 구간의 스케줄을 같은 시각(시·분)으로 오늘(KST) 날짜에 복제합니다.
        replace=True이면 대상 사용자의 오늘(KST) 기존 스케줄을 먼저 삭제합니다.
        """
        src_start, src_end = _kst_day_range_utc(source_date_int, 1)
        rows = await self._schedules.list_all_in_range(src_start, src_end)
        if user_id is not None:
            rows = [r for r in rows if r.user_id and UUID(r.user_id) == user_id]

        with_user = [r for r in rows if r.user_id]
        skipped_no_user = len(rows) - len(with_user)

        if not with_user:
            return {
                "source_date": source_date_int,
                "target_date": _today_kst_yyyymmdd(),
                "day_offset": 0,
                "created": 0,
                "deleted_today": 0,
                "skipped_no_user": skipped_no_user,
                "users_affected": 0,
                "message": "이동할 스케줄이 없습니다(user_id가 있는 행만 처리).",
            }

        s = str(source_date_int).zfill(8)
        src_day = date(int(s[:4]), int(s[4:6]), int(s[6:8]))
        today_day = datetime.now(timezone.utc).astimezone(KST).date()
        delta = today_day - src_day
        offset = timedelta(days=delta.days)

        target_int = _today_kst_yyyymmdd()
        tgt_start, tgt_end = _kst_day_range_utc(target_int, 1)

        user_ids = {UUID(r.user_id) for r in with_user if r.user_id}
        deleted = 0
        if replace:
            for uid in user_ids:
                deleted += await self._schedules.delete_by_user_date(uid, tgt_start, tgt_end)

        entries: list[dict] = []
        for r in with_user:
            uid = UUID(r.user_id) if r.user_id else None
            entries.append(
                {
                    "user_id": uid,
                    "timestamp": r.timestamp + offset,
                    "description": r.description,
                    "calls": list(r.calls) if r.calls else [],
                    "location": r.location,
                    "is_home": r.is_home,
                    "metadata": dict(r.metadata) if r.metadata else {},
                    "status": list(r.status) if isinstance(r.status, list) else [],
                }
            )

        created_n = 0
        for i in range(0, len(entries), CHUNK):
            chunk = entries[i : i + CHUNK]
            created = await self._schedules.bulk_create(chunk)
            created_n += len(created)

        return {
            "source_date": source_date_int,
            "target_date": target_int,
            "day_offset": delta.days,
            "created": created_n,
            "deleted_today": deleted,
            "skipped_no_user": skipped_no_user,
            "users_affected": len(user_ids),
            "message": None,
        }

    async def observation_heartbeat(
        self,
        *,
        base_url: str,
        location_id: UUID,
        detail: str = "GET /health (demo heartbeat)",
    ) -> dict:
        """내부 /health 호출 결과를 api_observations에 1건 기록합니다."""
        url = f"{base_url.rstrip('/')}/health"
        started = datetime.now(timezone.utc)
        http_status: int | None = None
        outcome = "failure"
        description = ""

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
            http_status = resp.status_code
            elapsed_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
            if resp.status_code < 300:
                outcome = "success"
                description = f"{elapsed_ms}ms"
            elif resp.status_code < 500:
                outcome = "warning"
                description = f"HTTP {resp.status_code} · {elapsed_ms}ms"
            else:
                outcome = "failure"
                text = (resp.text or "")[:400]
                description = text or f"HTTP {resp.status_code}"
        except Exception as e:
            description = str(e)[:500]

        await self._observations.ingest_batch(
            [
                {
                    "observed_at": datetime.now(timezone.utc),
                    "method": "GET",
                    "detail": detail,
                    "http_status": http_status,
                    "outcome": outcome,
                    "description": description,
                    "location_id": location_id,
                    "user_id": None,
                }
            ]
        )

        return {
            "recorded": True,
            "probed_url": url,
            "http_status": http_status,
            "outcome": outcome,
            "description": description,
            "location_id": str(location_id),
        }

    async def seed_fake_today(
        self,
        *,
        location_id: UUID | None,
        user_id: UUID | None,
        replace_schedules: bool,
        seed_schedules: bool,
        seed_observations: bool,
        observation_interval_minutes: int,
        observations_full_kst_day: bool,
        assign_observations_to_users: bool,
        create_demo_entities_if_empty: bool,
    ) -> dict:
        created_entities = False
        loc_id = location_id

        all_users = await self._users.get_all()
        if not all_users and create_demo_entities_if_empty:
            locs = await self._locations.get_all()
            if not locs:
                loc = await self._locations.create(
                    name="데모 위치",
                    timezone="Asia/Seoul",
                    description="seed-fake-today 자동 생성",
                    location_code="demo-seed",
                )
                loc_id = loc.id
            else:
                loc_id = locs[0].id
            await self._users.create(
                location_id=loc_id,
                name="데모 사용자",
                email="demo@example.local",
                job="가짜 데이터",
            )
            created_entities = True
            all_users = await self._users.get_all()

        if not all_users:
            return {
                "location_id": str(loc_id) if loc_id else "",
                "user_ids": [],
                "schedules_created": 0,
                "schedules_deleted": 0,
                "observations_created": 0,
                "created_demo_entities": False,
                "message": "사용자가 없습니다. create_demo_entities_if_empty=true 로 재시도하세요.",
            }

        if user_id is not None:
            target_users = [u for u in all_users if u.id == user_id]
            if not target_users:
                return {
                    "location_id": str(loc_id) if loc_id else str(all_users[0].location_id),
                    "user_ids": [],
                    "schedules_created": 0,
                    "schedules_deleted": 0,
                    "observations_created": 0,
                    "created_demo_entities": created_entities,
                    "message": "지정한 user_id를 찾을 수 없습니다.",
                }
        else:
            target_users = all_users

        if loc_id is None:
            loc_id = target_users[0].location_id

        today_int = _today_kst_yyyymmdd()
        tgt_start, tgt_end = _kst_day_range_utc(today_int, 1)

        sched_deleted = 0
        sched_created = 0
        if seed_schedules:
            for u in target_users:
                if replace_schedules:
                    sched_deleted += await self._schedules.delete_by_user_date(u.id, tgt_start, tgt_end)
                entries: list[dict] = []
                for h, m, loc_name, desc, is_home, calls, tags in _FAKE_SCHEDULE_DAY:
                    entries.append(
                        {
                            "user_id": u.id,
                            "timestamp": _kst_today_at(h, m),
                            "description": desc,
                            "calls": calls,
                            "location": loc_name,
                            "is_home": is_home,
                            "metadata": {"demo_seed": True, "fake": True},
                            "status": tags,
                        }
                    )
                for i in range(0, len(entries), CHUNK):
                    chunk = entries[i : i + CHUNK]
                    created = await self._schedules.bulk_create(chunk)
                    sched_created += len(created)

        obs_created = 0
        if seed_observations:
            now_kst = datetime.now(KST)
            day_start_kst = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end_kst = day_start_kst + timedelta(days=1)
            step = timedelta(minutes=observation_interval_minutes)
            t = day_start_kst
            obs_rows: list[dict] = []
            idx = 0
            user_ids_for_rr = [u.id for u in target_users]
            while True:
                if observations_full_kst_day:
                    if t >= day_end_kst:
                        break
                elif t > now_kst:
                    break
                oc, st, det, des = _FAKE_OBS_PATTERN[idx % len(_FAKE_OBS_PATTERN)]
                uid: UUID | None = None
                if assign_observations_to_users and user_ids_for_rr:
                    uid = user_ids_for_rr[idx % len(user_ids_for_rr)]
                obs_rows.append(
                    {
                        "observed_at": t.astimezone(timezone.utc),
                        "method": "GET",
                        "detail": f"{det} (#{idx})",
                        "http_status": st,
                        "outcome": oc,
                        "description": des,
                        "location_id": loc_id,
                        "user_id": uid,
                    }
                )
                idx += 1
                t += step

            for j in range(0, len(obs_rows), OBS_BATCH):
                batch = obs_rows[j : j + OBS_BATCH]
                await self._observations.ingest_batch(batch)
                obs_created += len(batch)

        return {
            "location_id": str(loc_id),
            "user_ids": [str(u.id) for u in target_users],
            "schedules_created": sched_created,
            "schedules_deleted": sched_deleted,
            "observations_created": obs_created,
            "created_demo_entities": created_entities,
            "message": None,
        }
