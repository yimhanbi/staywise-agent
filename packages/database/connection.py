from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator



#엔진과 세션 메이커를 글로벌로 정의
class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.sessino_maker = None


    def init(self,db_url:str):
        self.engine = create_async_engine(db_url, echo=True)
        self.session_maker = async_sessionmaker(self.engine, expire_on_commit=False)

    async def close(self):
        if self.engine:
            await self.engine.dispose()

db_manager = DatabaseManager()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with db_manager.session_maker() as session:
        yield session