"""One-shot script to seed news immediately."""

import asyncio
import sys
import os

# Make sure the app package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def main():
    from app.services.news_fetcher import fetch_and_save_articles
    print("Fetching news articles from Currents API...")
    try:
        articles = await fetch_and_save_articles()
        print(f"Done! Saved {len(articles)} new articles to the database.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
