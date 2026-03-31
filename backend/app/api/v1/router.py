from fastapi import APIRouter

from app.api.v1.endpoints import life_logs, locations, proxy, schedules, simulations, users

router = APIRouter()
router.include_router(locations.router, prefix="/locations", tags=["locations"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(life_logs.router, prefix="/life-logs", tags=["life-logs"])
router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
router.include_router(simulations.router, prefix="/simulations", tags=["simulations"])
router.include_router(proxy.router, prefix="/proxy", tags=["proxy"])
