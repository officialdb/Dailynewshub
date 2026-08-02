"""
One-shot script: sync all v1 categories → v2 (NMS) database.
Run from the backend/ directory:  python sync_categories_v2.py
"""

import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def main():
    from app.core.config import settings
    import asyncpg

    # Build raw connection strings from DATABASE_URL (asyncpg format)
    v1_dsn = str(settings.DATABASE_URL).replace("postgresql+asyncpg://", "postgresql://")
    v2_dsn = str(settings.DATABASE_V2_URL).replace("postgresql+asyncpg://", "postgresql://")

    print(f"Connecting to v1: {v1_dsn.split('@')[-1]}")
    print(f"Connecting to v2: {v2_dsn.split('@')[-1]}")

    v1_conn = await asyncpg.connect(v1_dsn)
    v2_conn = await asyncpg.connect(v2_dsn)

    # Fetch categories from v1 (only what the v2 schema needs)
    rows = await v1_conn.fetch("SELECT name, slug, icon FROM categories ORDER BY name")
    print(f"Found {len(rows)} categories in v1")

    inserted = skipped = 0
    for row in rows:
        existing = await v2_conn.fetchval("SELECT id FROM categories WHERE slug = $1", row["slug"])
        if existing:
            skipped += 1
            continue
        await v2_conn.execute(
            "INSERT INTO categories (id, name, slug, icon, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW())",
            row["name"], row["slug"], row["icon"]
        )
        inserted += 1

    await v1_conn.close()
    await v2_conn.close()

    print(f"Done! Inserted {inserted} new categories, skipped {skipped} (already existed).")

if __name__ == "__main__":
    asyncio.run(main())
