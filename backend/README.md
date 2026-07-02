# Daily News Hub Backend

FastAPI backend for the Daily News Hub mobile app.

## Tech Stack

- FastAPI
- PostgreSQL
- SQLAlchemy async
- Alembic
- JWT auth with `python-jose` and `passlib`
- APScheduler
- Redis
- Celery
- Firebase Cloud Messaging

## Prerequisites

- Python 3.11 recommended
- PostgreSQL running locally or reachable from your network
- Redis running locally or reachable from your network

## First-Time Setup

1. Enter the backend directory:
   ```bash
   cd /home/official/projects/Dailynewshub/backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   ```
3. Upgrade packaging tools and install dependencies:
   ```bash
   python -m pip install --upgrade pip setuptools wheel
   python -m pip install -r requirements.txt
   ```
4. Copy the environment file and fill in real values if needed:
   ```bash
   cp .env.example .env
   ```
5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

## Start the Application

Start the services in this order:

1. Start PostgreSQL.
2. Start Redis.
3. Activate the backend virtual environment:
   ```bash
   cd /home/official/projects/Dailynewshub/backend
   source .venv/bin/activate
   ```
4. Start the backend API:
   ```bash
   uvicorn app.main:app --reload
   ```

## Common Local Service Commands

If Redis is not already running:

```bash
redis-server --port 6379
```

If PostgreSQL is installed as a service on your machine:

```bash
sudo systemctl start postgresql
```

If you want the service to come back automatically after reboot:

```bash
sudo systemctl enable postgresql
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

Check if redis is up

```
redis-cli ping 

```

If your distro names the Redis service differently, try:

```bash
sudo systemctl start redis
sudo systemctl enable redis
```

## Stop and Restart

If you shut the app down, restart it with:

```bash
cd /home/official/projects/Dailynewshub/backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

If Redis or PostgreSQL were stopped too, start them first before relaunching Uvicorn.

## Useful Health Checks

- `GET /api/v1/health`
- `GET /api/v1/status`

## Docker

Docker support is deferred for now and will be added later with the full container stack.
