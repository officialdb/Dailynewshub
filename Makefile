.PHONY: backend backend-stop adb-tunnel

# Starts all backend services (PostgreSQL, Redis, Uvicorn, Celery) in the background
backend:
	@echo "🚀 Starting all backend services..."
	cd backend && docker compose up -d

# Stops all backend services
backend-stop:
	@echo "🛑 Stopping all backend services..."
	cd backend && docker compose down

# Maps localhost:8000 on the connected Android device to localhost:8000 on this machine
adb-tunnel:
	@echo "🔌 Re-establishing ADB tunnel..."
	-/home/official/Android/Sdk/platform-tools/adb reverse tcp:8000 tcp:8000 || echo "⚠️  No Android device/emulator found. ADB tunnel skipped."
	@echo "✅ ADB tunnel active!"

# Starts backend and creates ADB tunnel for mobile testing
start: backend adb-tunnel
	@echo "✅ Everything is up and running!"
