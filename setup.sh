#!/bin/bash
set -eo pipefail

# ─────────────────────────────────────────
#  Driftlock Bootstrap Script
# ─────────────────────────────────────────

echo ""
echo "🔒 Driftlock Bootstrap"
echo "─────────────────────────────────────────"
echo ""

# If piped from curl, we can't read from stdin — re-open /dev/tty
if [ ! -t 0 ]; then
    echo "Detected pipe mode — downloading repo first..."
    
    # Install git if missing
    if ! command -v git &> /dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y -qq git
    fi
    
    # Clone the repo
    if [ ! -d "driftlock" ]; then
        git clone --depth 1 https://github.com/shinchan1907/DriftLock.git driftlock
    fi
    
    cd driftlock
    echo "Re-running setup in interactive mode..."
    exec bash setup.sh
    exit 0
fi

# ─────────────────────────────────────────
#  1. Install Docker (if not present)
# ─────────────────────────────────────────

if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    echo "✓ Docker installed"
else
    echo "✓ Docker already installed"
fi

# Ensure docker compose plugin works
if ! docker compose version &> /dev/null; then
    echo "❌ docker compose plugin not found. Please install Docker Compose v2."
    exit 1
fi

# ─────────────────────────────────────────
#  2. Interactive Prompts
# ─────────────────────────────────────────

echo ""
echo "Please provide the following details:"
echo ""

read -r -p "🌐 Your domain name (e.g. ddns.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "❌ Domain cannot be empty."
    exit 1
fi

read -r -p "👤 Admin username [admin]: " ADMIN_USERNAME
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

read -r -s -p "🔑 Admin password: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ Password cannot be empty."
    exit 1
fi

read -r -p "📧 Email for Let's Encrypt SSL: " LETSENCRYPT_EMAIL
if [ -z "$LETSENCRYPT_EMAIL" ]; then
    echo "❌ Email cannot be empty."
    exit 1
fi

SERVER_URL="https://${DOMAIN}"

# ─────────────────────────────────────────
#  3. Generate Secrets
# ─────────────────────────────────────────

SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_SALT=$(openssl rand -hex 16)

echo ""
echo "⚙️  Generating configuration..."

# ─────────────────────────────────────────
#  4. Write .env file
# ─────────────────────────────────────────

cat > .env <<ENVFILE
# ── Core ──────────────────────────────────────────────────
ENVIRONMENT=production
SECRET_KEY=${SECRET_KEY}
DOMAIN=${DOMAIN}
SERVER_URL=${SERVER_URL}

# ── Admin Account ─────────────────────────────────────────
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# ── JWT ───────────────────────────────────────────────────
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Database ──────────────────────────────────────────────
DATABASE_URL=sqlite+aiosqlite:////app/data/driftlock.db

# ── Encryption ────────────────────────────────────────────
ENCRYPTION_SALT=${ENCRYPTION_SALT}

# ── CORS ──────────────────────────────────────────────────
CORS_ORIGINS=https://${DOMAIN}

# ── Rate Limiting ─────────────────────────────────────────
UPDATE_RATE_LIMIT=60/minute
LOGIN_RATE_LIMIT=5/minute

# ── Agent ─────────────────────────────────────────────────
AGENT_VERSION=1.0.0
ENVFILE

echo "✓ .env file created"

# ─────────────────────────────────────────
#  5. Build Frontend
# ─────────────────────────────────────────

echo ""
echo "🏗️  Building frontend..."
docker compose run --rm frontend
echo "✓ Frontend built"

# ─────────────────────────────────────────
#  6. Start Services (HTTP first for cert)
# ─────────────────────────────────────────

echo ""
echo "🚀 Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx backend
sleep 5
echo "✓ Services started"

# ─────────────────────────────────────────
#  7. Obtain SSL Certificate
# ─────────────────────────────────────────

echo ""
echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot \
    certonly --webroot -w /var/www/certbot \
    --email "${LETSENCRYPT_EMAIL}" \
    --agree-tos --no-eff-email \
    -d "${DOMAIN}"

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate obtained"
else
    echo "⚠️  SSL certificate failed — dashboard will work on HTTP only"
    echo "   Make sure your domain's A record points to this server's IP"
    echo "   Then re-run: docker compose run --rm certbot certonly --webroot -w /var/www/certbot --email ${LETSENCRYPT_EMAIL} --agree-tos --no-eff-email -d ${DOMAIN}"
fi

# ─────────────────────────────────────────
#  8. Reload Nginx with SSL
# ─────────────────────────────────────────

echo ""
echo "🔄 Reloading Nginx with SSL..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload 2>/dev/null || true
echo "✓ Nginx reloaded"

# ─────────────────────────────────────────
#  Done!
# ─────────────────────────────────────────

echo ""
echo "─────────────────────────────────────────"
echo "╔═══════════════════════════════════════════╗"
echo "║                                           ║"
echo "║   🔒 Driftlock is live!                   ║"
echo "║                                           ║"
echo "║   Dashboard:  https://${DOMAIN}            "
echo "║   Username:   ${ADMIN_USERNAME}             "
echo "║                                           ║"
echo "║   Star us: github.com/shinchan1907/DriftLock"
echo "║                                           ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Open https://${DOMAIN} in your browser"
echo "  2. Log in with your admin credentials"
echo "  3. Go to Setup → paste your Cloudflare API token"
echo "  4. Add your first service and download an agent"
echo ""
