import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def fix():
    from sqlalchemy import update
    from app.db.session import AsyncSessionLocal
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        await db.execute(update(User).values(is_active=True))
        await db.commit()
        print("✅ All user accounts reactivated (is_active=True).")

if __name__ == "__main__":
    asyncio.run(fix())
