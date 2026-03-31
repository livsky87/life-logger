from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from app.config import settings

router = APIRouter()

_http_client = None


def get_http_client():
    global _http_client
    if _http_client is None:
        import httpx
        _http_client = httpx.AsyncClient(timeout=30.0)
    return _http_client


@router.api_route(
    "/smartthings/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    tags=["proxy"],
)
async def proxy_smartthings(path: str, request: Request):
    """
    Proxy requests to SmartThings API.
    Keeps the SmartThings Bearer token server-side.
    """
    if not settings.smartthings_token:
        return JSONResponse(
            {"detail": "SmartThings token not configured. Set SMARTTHINGS_TOKEN env var."},
            status_code=503,
        )

    client = get_http_client()
    body = await request.body()
    upstream_url = f"https://api.smartthings.com/v1/{path}"

    upstream = await client.request(
        method=request.method,
        url=upstream_url,
        headers={
            "Authorization": f"Bearer {settings.smartthings_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        content=body,
        params=dict(request.query_params),
    )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type="application/json",
    )


@router.get("/home-presence/status", tags=["proxy"])
async def proxy_home_presence():
    """
    Proxy request to Home Data Engine's /home-presence/status endpoint.
    Returns: {inferenceId, locationId, version, result, feedback: {feedback}}
    """
    if not settings.home_data_engine_url:
        return JSONResponse(
            {"detail": "Home Data Engine URL not configured. Set HOME_DATA_ENGINE_URL env var."},
            status_code=503,
        )

    client = get_http_client()
    upstream = await client.get(
        f"{settings.home_data_engine_url.rstrip('/')}/home-presence/status",
        headers={"Accept": "application/json"},
    )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type="application/json",
    )
