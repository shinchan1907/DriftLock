# ─── Stage 1: Build React frontend ───────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Install Python dependencies ─────────────────────
FROM python:3.11-slim AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ─── Stage 3: Final all-in-one image ──────────────────────────
FROM python:3.11-slim AS final
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor \
    && mkdir -p /app/data \
    && rm -f /etc/nginx/sites-enabled/default

COPY --from=backend-builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

COPY backend/app /app/app
COPY --from=frontend-builder /app/dist /var/www/html

COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/nginx.conf /etc/nginx/sites-available/driftlock

RUN ln -s /etc/nginx/sites-available/driftlock \
    /etc/nginx/sites-enabled/driftlock

VOLUME ["/app/data"]
EXPOSE 80

CMD ["/usr/bin/supervisord", "-n", "-c", \
    "/etc/supervisor/conf.d/supervisord.conf"]
