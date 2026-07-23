import asyncio
from app.db.session import AsyncSessionLocal
from app.models.reel import Reel
from sqlalchemy import select, func

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Reel.channel_name, func.count(Reel.id)).group_by(Reel.channel_name))
        for row in result:
            print(f"Channel: {row[0]}, Count: {row[1]}")

asyncio.run(main())
