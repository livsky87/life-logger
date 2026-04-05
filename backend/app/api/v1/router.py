from fastapi import APIRouter

from app.api.v1.endpoints import api_observations, demo, life_logs, locations, proxy, schedules, users

router = APIRouter()
router.include_router(api_observations.router, prefix="/api-observations", tags=["api-observations"])
router.include_router(demo.router, prefix="/demo", tags=["demo"])
router.include_router(locations.router, prefix="/locations", tags=["locations"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(life_logs.router, prefix="/life-logs", tags=["life-logs"])
router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
router.include_router(proxy.router, prefix="/proxy", tags=["proxy"])
