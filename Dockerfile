# Stage 1 — frontend builder
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# Output: /app/dist/ contains the built React SPA

# Stage 2 — Python builder
FROM python:3.11-slim AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 3 — final image
FROM python:3.11-slim AS final

# Install nginx and supervisor
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Environment variables for Python to use .local packages
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# Copy Python packages from builder
COPY --from=backend-builder /root/.local /root/.local

# Copy backend source
COPY backend/app /app/app

# Copy built React frontend into nginx web root
COPY --from=frontend-builder /app/dist /var/www/html/driftlock

# Copy configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 80 443

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
