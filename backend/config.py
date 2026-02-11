from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Staywise API"
    debug: bool = False
    database_url: str = "postgresql://user:password@localhost:5432/staywise"
    api_prefix: str = "/api"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
