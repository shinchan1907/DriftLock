# ═══════════════════════════════════════════════════════════
#  Driftlock Frontend Builder
#
#  Builds the React app, then copies output into /app/dist
#  which is the volume mount point shared with nginx.
#
#  The build happens in a temp dir so the volume mount at
#  /app/dist doesn't overlay the build output.
# ═══════════════════════════════════════════════════════════

FROM node:18-alpine

WORKDIR /build

# Install dependencies first (Docker layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline 2>/dev/null || npm install

# Copy source and build to /build/dist (NOT /app/dist)
COPY . .
RUN npm run build

# At runtime, copy the pre-built files into the mounted volume
# /app/dist is where the frontend_build volume is mounted
CMD ["sh", "-c", "cp -r /build/dist/* /app/dist/ 2>/dev/null || cp -r /build/dist/. /app/dist/ && echo 'Frontend build copied to volume'"]
