from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "Staywise API"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/staywise"
    api_prefix: str = "/api"
    
    #API 키 추가
    DATA_GO_KR_SERVICE_KEY: Optional[str]=None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


settings = Settings()
