# --- DOCKER FIX ---
# Stage 1: Builder - installs dependencies, never included in final image.
FROM python:3.11-slim AS builder

# --- DOCKER FIX ---
# Install build dependencies needed to compile Python packages.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# --- DOCKER FIX ---
WORKDIR /app

# --- DOCKER FIX ---
# Copy requirements first for layer cache efficiency.
COPY requirements.txt .

# --- DOCKER FIX ---
# Install to a user directory so runtime can copy only Python dependencies.
RUN pip install --no-cache-dir --user -r requirements.txt

# --- DOCKER FIX ---
# Stage 2: Runtime - minimal final image with only what the app needs.
FROM python:3.11-slim AS runtime

# --- DOCKER FIX ---
# Install only runtime system dependencies, not build tools.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# --- DOCKER FIX ---
# Create non-root user and group for runtime safety.
RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup --no-create-home appuser

# --- DOCKER FIX ---
WORKDIR /app

# --- DOCKER FIX ---
COPY --from=builder /root/.local /home/appuser/.local

# --- DOCKER FIX ---
COPY --chown=appuser:appgroup . .

# --- DOCKER FIX ---
RUN chown appuser:appgroup /app

# --- DOCKER FIX ---
USER appuser

# --- DOCKER FIX ---
ENV PATH=/home/appuser/.local/bin:$PATH
# --- DOCKER FIX ---
ENV HOME=/home/appuser
# --- DOCKER FIX ---
ENV PYTHONPATH=/home/appuser/.local/lib/python3.11/site-packages
# --- DOCKER FIX ---
ENV PYTHONDONTWRITEBYTECODE=1
# --- DOCKER FIX ---
ENV PYTHONUNBUFFERED=1

# --- DOCKER FIX ---
EXPOSE 8000

# --- DOCKER FIX ---
# Exec form preserves SIGTERM handling for graceful Docker shutdown.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
