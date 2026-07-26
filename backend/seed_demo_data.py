"""Seed default news categories and demo articles."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def seed_data():
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.models.category import Category
    from app.models.article import Article

    categories_data = [
        {"name": "Technology", "slug": "technology", "icon": "tech"},
        {"name": "Business", "slug": "business", "icon": "business"},
        {"name": "Sports", "slug": "sports", "icon": "sports"},
        {"name": "Entertainment", "slug": "entertainment", "icon": "movie"},
        {"name": "Science", "slug": "science", "icon": "science"},
        {"name": "Health", "slug": "health", "icon": "health"},
        {"name": "Politics", "slug": "politics", "icon": "politics"},
    ]

    async with AsyncSessionLocal() as db:
        category_map = {}
        for cat in categories_data:
            existing = await db.scalar(select(Category).where(Category.slug == cat["slug"]))
            if not existing:
                c = Category(name=cat["name"], slug=cat["slug"], icon=cat["icon"])
                db.add(c)
                await db.flush()
                category_map[cat["slug"]] = c
            else:
                category_map[cat["slug"]] = existing

        articles_data = [
            {
                "title": "Next-Gen AI Models Transform Autonomous Software Development",
                "description": "Artificial intelligence tools continue to reshape software engineering with automated code generation, refactoring, and test generation capabilities.",
                "content": "Deep Learning models are enabling unprecedented productivity across global software developer teams. Automated agents now assist with pull request reviews, infrastructure orchestration, and unit testing.",
                "source_name": "TechCrunch",
                "source_url": "https://techcrunch.com/2026/07/26/next-gen-ai-models",
                "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
                "author": "Sarah Jenkins",
                "category_slug": "technology",
                "is_featured": True,
                "is_trending": True,
            },
            {
                "title": "Global Markets Reach Record Highs Amid Economic Growth",
                "description": "Stock indices around the world experienced strong rally fueled by lower inflation numbers and resilient consumer demand.",
                "content": "Financial markets logged landmark gains across tech and energy sectors. Investors express confidence in upcoming monetary policy adjustments.",
                "source_name": "Bloomberg",
                "source_url": "https://bloomberg.com/news/articles/2026-07-26/global-markets-highs",
                "image_url": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
                "author": "Michael Chang",
                "category_slug": "business",
                "is_featured": False,
                "is_trending": True,
            },
            {
                "title": "Championship Finals Deliver Thrilling Victory in Overtime",
                "description": "An intense final match ended with an extraordinary buzzer-beater shot in the final seconds of extra time.",
                "content": "Fans witnessed a historic game as the underdog team executed a flawless defense in the closing moments to secure the trophy.",
                "source_name": "ESPN",
                "source_url": "https://espn.com/articles/2026-07-26/championship-finals",
                "image_url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800",
                "author": "David Miller",
                "category_slug": "sports",
                "is_featured": True,
                "is_trending": False,
            },
        ]

        inserted = 0
        for art in articles_data:
            cat_slug = art.pop("category_slug")
            cat = category_map.get(cat_slug)
            if cat:
                existing_art = await db.scalar(select(Article).where(Article.source_url == art["source_url"]))
                if not existing_art:
                    article = Article(category_id=cat.id, **art)
                    db.add(article)
                    inserted += 1

        await db.commit()
        print(f"✅ Seeding complete: {len(categories_data)} categories verified, {inserted} new sample articles inserted.")

if __name__ == "__main__":
    asyncio.run(seed_data())
