"""One-shot script to seed or reset the default Admin account."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def seed_admin():
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash

    email = "admin@gmail.com"
    password = "password123"
    name = "System Administrator"

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            print(f"User {email} exists. Updating credentials and admin privileges...")
            user.name = name
            user.password_hash = get_password_hash(password)
            user.is_admin = True
            user.is_active = True
        else:
            print(f"Creating new Admin user: {email}...")
            user = User(
                name=name,
                email=email,
                password_hash=get_password_hash(password),
                is_admin=True,
                is_active=True,
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)
        print("✅ Admin account successfully configured!")
        print(f"   Email:    {email}")
        print(f"   Password: {password}")
        print(f"   Role:     Admin (is_admin=True, is_active=True)")

if __name__ == "__main__":
    asyncio.run(seed_admin())
