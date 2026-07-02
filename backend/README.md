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

### Build and run locally

From `/backend`:

```bash
docker build -t dailynewshub-backend .
```

```bash
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://postgres:password123@db:5432/dailynewshub \
  -e REDIS_URL=redis://redis:6379/0 \
  -e CELERY_BROKER_URL=redis://redis:6379/1 \
  -e CELERY_RESULT_BACKEND=redis://redis:6379/2 \
  -e SECRET_KEY="&=QCjUG$$v+Ny<f%{RaZ{V)J#<t-8xG,D_ZH3;/E0:F" \
  dailynewshub-backend
```

### Docker Compose

A local compose stack is provided for development and staging verification:

```bash
docker compose up --build
```

This starts:

- `db` (PostgreSQL)
- `redis`
- `backend` (FastAPI)

### AWS deployment and CI/CD

This project uses **GitHub Actions** to automatically build and deploy the backend to AWS EC2 on push to `main` branch.

**Setup required:**
- AWS ECR repository for Docker images
- AWS EC2 instance for running the application
- GitHub repository secrets for AWS credentials and EC2 access

**Full setup guide:** See [DEPLOYMENT.md](../DEPLOYMENT.md) in the project root.

**Quick Overview:**
1. Code pushed to `main` → GitHub Actions triggers
2. Docker image built and pushed to AWS ECR
3. SSH into EC2 and pull latest image
4. `docker compose up -d` restarts application with new image

Ensure production environment sets required variables:
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `FIREBASE_CREDENTIALS_PATH`

