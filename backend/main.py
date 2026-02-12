import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure local monorepo package imports (packages/database) resolve at runtime.
PACKAGES_DIR = Path(__file__).resolve().parents[1] / "packages"
if str(PACKAGES_DIR) not in sys.path:
    sys.path.insert(0, str(PACKAGES_DIR))

#packages/database에서 db_manager를 가져오기
from database.connection import db_manager
from config import settings
from routers import health, hotels


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_manager.init(settings.database_url)

    yield

    #앱 종료 시: DB 커넥션 풀 정리
    await db_manager.close()


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3005", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(health.router, tags=["health"])
app.include_router(hotels.router, prefix=settings.api_prefix, tags=["hotels"])


@app.get("/")
def root():
    return {"service": settings.app_name}
