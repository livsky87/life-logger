from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # 로컬: backend/.env 또는 저장소 루트 ../.env (docker compose는 컨테이너 env로 주입)
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://life_logger:changeme@localhost:5432/life_logger"
    cors_origins: str = "http://localhost:3000"
    # 비-GET /api/v1 요청의 Authorization: Bearer 와 일치 (소스에 기본값 없음 — 반드시 API_ADMIN_TOKEN 설정)
    api_admin_token: str = Field(..., min_length=1, description="Set API_ADMIN_TOKEN in environment or .env")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
