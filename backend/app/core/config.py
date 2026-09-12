import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PMPML_LIVE_API_URL: str = "https://prod-pmpml-live-data-api.chartr.in"
    PMPML_ROUTES_API_URL: str = "https://prod-pmpml-routesapi.chartr.in"
    PMPML_API_KEY: str = ""
    PMPML_POLL_INTERVAL_SECONDS: int = 15

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
