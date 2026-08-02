import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api/v2") as client:
        # login
        res = await client.post("/auth/login", json={"email": "admin@example.com", "password": "adminpassword"})
        if res.status_code != 200:
            print("Login failed", res.text)
            return
        token = res.json()["data"]["tokens"]["access_token"]
        
        # GET users
        res2 = await client.get("/users", headers={"Authorization": f"Bearer {token}"})
        print(res2.status_code)
        print(res2.text[:1000])

asyncio.run(main())
