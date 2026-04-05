"""비-GET /api/v1 요청에 Bearer 토큰 검사."""

import hmac
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings


def _bearer_token_valid(authorization: str | None, expected: str) -> bool:
    if not authorization:
        return False
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return False
    got = parts[1].strip()
    try:
        return hmac.compare_digest(got.encode("utf-8"), expected.encode("utf-8"))
    except (TypeError, ValueError):
        return False


class AdminTokenMiddleware(BaseHTTPMiddleware):
    """GET/HEAD/OPTIONS 및 /api/v1 밖 경로는 통과. 그 외 /api/v1/* 는 Bearer 토큰 필요."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)
        path = request.url.path
        if not path.startswith("/api/v1"):
            return await call_next(request)
        if not _bearer_token_valid(request.headers.get("authorization"), settings.api_admin_token):
            return JSONResponse(
                status_code=401,
                content={"detail": "인증이 필요합니다. 헤더: Authorization: Bearer <token>"},
            )
        return await call_next(request)
