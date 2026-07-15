import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def main():
    from app.services.youtube_fetcher import fetch_and_save_reels
    print("Fetching reels...")
    reels = await fetch_and_save_reels()
    print(f"Done, fetched {len(reels)} reels")

if __name__ == "__main__":
    asyncio.run(main())
