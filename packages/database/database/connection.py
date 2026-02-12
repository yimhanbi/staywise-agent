from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.session_maker = None

    def init(self, db_url: str):
        normalized_url = db_url
        if normalized_url.startswith("postgresql://"):
            normalized_url = normalized_url.replace("postgresql://", "postgresql+asyncpg://", 1)

        self.engine = create_async_engine(normalized_url, echo=True)
        self.session_maker = async_sessionmaker(self.engine, expire_on_commit=False)

    async def close(self):
        if self.engine:
            await self.engine.dispose()


db_manager = DatabaseManager()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with db_manager.session_maker() as session:
        yield session

