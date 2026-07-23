import asyncio
import os
import httpx

async def main():
    key = os.environ.get('YOUTUBE_API_KEY', '')
    channels = [
        "UCupvZG-5ko_eiXAupbDfxWw",
        "UC16niRr50-MSBwiU3Q1WZDg",
        "UCQFkJAphQPpndFHxBpGpjuA"
    ]
    async with httpx.AsyncClient() as client:
        for c in channels:
            url = f"https://www.googleapis.com/youtube/v3/search?key={key}&channelId={c}&part=snippet&order=date&type=video&maxResults=10"
            resp = await client.get(url)
            print(f"Channel {c}: {resp.status_code}")
            if resp.status_code != 200:
                print(resp.text)
                
asyncio.run(main())
