#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  Driftlock — Production Bootstrap Script
#  https://github.com/shinchan1907/DriftLock
#
#  Tested on: Ubuntu 22.04 LTS (AWS Lightsail)
#  Requirements: A domain pointed at this server's IP
# ═══════════════════════════════════════════════════════════
set -eo pipefail

# ── Colors ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗${NC}  $1"; }
step()    { echo -e "\n${BOLD}── $1 ──${NC}"; }

# ── Banner ────────────────────────────────────────────────
echo ""
echo -e "${BOLD}"
echo "  ____       _  __ _   _               _    "
echo " |  _ \ _ __(_)/ _| |_| |    ___   ___| | __"
echo " | | | | '__| | |_| __| |   / _ \ / __| |/ /"
echo " | |_| | |  | |  _| |_| |__| (_) | (__|   < "
echo " |____/|_|  |_|_|  \__|_____\___/ \___|_|\_\\"
echo -e "${NC}"
echo -e "${CYAN}  Self-hosted DDNS with a beautiful GUI${NC}"
echo "  ─────────────────────────────────────────"
echo ""

# ── Pipe-to-bash detection ────────────────────────────────
# curl | bash consumes stdin — we need an interactive terminal
if [ ! -t 0 ]; then
    info "Detected pipe mode (curl | bash)"
    info "Cloning repository and re-running interactively..."

    if ! command -v git &> /dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y -qq git > /dev/null 2>&1
    fi

    INSTALL_DIR="$HOME/driftlock"
    if [ -d "$INSTALL_DIR" ]; then
        info "Updating existing installation at $INSTALL_DIR"
        cd "$INSTALL_DIR"
        git pull --ff-only origin main 2>/dev/null || true
    else
        git clone --depth 1 https://github.com/shinchan1907/DriftLock.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    exec bash setup.sh
fi

# ── Ensure running from the repo root ─────────────────────
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found."
    error "Please run this script from the driftlock project root."
    echo "  cd ~/driftlock && bash setup.sh"
    exit 1
fi

# ── OS Check ──────────────────────────────────────────────
if [ ! -f /etc/os-release ]; then
    error "This script requires a Debian/Ubuntu-based system."
    exit 1
fi

. /etc/os-release
if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
    warn "This script is tested on Ubuntu 22.04. You're running $PRETTY_NAME."
    warn "Proceeding anyway — Docker install commands may differ."
fi

# ═══════════════════════════════════════════════════════════
#  STEP 1: Install Docker
# ═══════════════════════════════════════════════════════════
step "Step 1/7: Docker"

if command -v docker &> /dev/null; then
    success "Docker already installed ($(docker --version | head -1))"
else
    info "Installing Docker CE..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq ca-certificates curl gnupg > /dev/null 2>&1

    sudo install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
            sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $VERSION_CODENAME stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1

    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker "$USER"
    success "Docker installed"
fi

# ── Docker permission detection ───────────────────────────
# After a fresh install, group membership isn't active until re-login.
# Detect this and prefix docker commands with sudo when needed.
DOCKER="docker"
if ! docker info &> /dev/null 2>&1; then
    DOCKER="sudo docker"
    info "Using sudo for Docker (group not active until next login)"
fi

if ! $DOCKER compose version &> /dev/null 2>&1; then
    error "Docker Compose V2 plugin not found."
    error "Install it: sudo apt-get install -y docker-compose-plugin"
    exit 1
fi
success "Docker Compose V2 ready"

# ═══════════════════════════════════════════════════════════
#  STEP 2: Configure Firewall
# ═══════════════════════════════════════════════════════════
step "Step 2/7: Firewall"

if command -v ufw &> /dev/null; then
    # Only modify if ufw is active
    if sudo ufw status | grep -q "Status: active"; then
        sudo ufw allow 22/tcp   > /dev/null 2>&1 || true  # SSH — never lock yourself out
        sudo ufw allow 80/tcp   > /dev/null 2>&1 || true  # HTTP (certbot + redirect)
        sudo ufw allow 443/tcp  > /dev/null 2>&1 || true  # HTTPS
        success "Firewall: ports 22, 80, 443 open"
    else
        info "ufw is installed but inactive — skipping"
    fi
else
    info "ufw not found — make sure ports 80 and 443 are open in your cloud console"
fi

# ═══════════════════════════════════════════════════════════
#  STEP 3: Interactive Configuration
# ═══════════════════════════════════════════════════════════
step "Step 3/7: Configuration"

# Check if .env already exists with values
if [ -f .env ] && grep -q "^DOMAIN=" .env 2>/dev/null; then
    EXISTING_DOMAIN=$(grep "^DOMAIN=" .env | cut -d= -f2)
    if [ -n "$EXISTING_DOMAIN" ] && [ "$EXISTING_DOMAIN" != "localhost" ]; then
        echo ""
        warn "Existing configuration found (domain: $EXISTING_DOMAIN)"
        read -r -p "   Overwrite? [y/N]: " OVERWRITE
        if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
            info "Keeping existing .env — skipping to build step"
            # Source existing values for later use
            DOMAIN="$EXISTING_DOMAIN"
            ADMIN_USERNAME=$(grep "^ADMIN_USERNAME=" .env | cut -d= -f2 || echo "admin")
            SKIP_ENV=true
        fi
    fi
fi

if [ "${SKIP_ENV:-}" != "true" ]; then
    echo ""
    echo "  Please provide the following:"
    echo ""

    # Domain
    read -r -p "  🌐 Domain (e.g. ddns.example.com): " DOMAIN
    DOMAIN=$(echo "$DOMAIN" | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')
    if [ -z "$DOMAIN" ]; then
        error "Domain cannot be empty."
        exit 1
    fi

    # Validate domain format (basic check)
    if ! echo "$DOMAIN" | grep -qP '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'; then
        error "Invalid domain format: $DOMAIN"
        error "Expected format: ddns.example.com"
        exit 1
    fi

    # Admin username
    read -r -p "  👤 Admin username [admin]: " ADMIN_USERNAME
    ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
    ADMIN_USERNAME=$(echo "$ADMIN_USERNAME" | tr -d '[:space:]')

    # Admin password
    while true; do
        read -r -s -p "  🔑 Admin password (min 8 chars): " ADMIN_PASSWORD
        echo ""
        if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
            warn "Password must be at least 8 characters. Try again."
            continue
        fi
        read -r -s -p "  🔑 Confirm password: " ADMIN_PASSWORD_CONFIRM
        echo ""
        if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
            warn "Passwords don't match. Try again."
            continue
        fi
        break
    done

    # Email for Let's Encrypt
    read -r -p "  📧 Email for SSL certificate: " LETSENCRYPT_EMAIL
    LETSENCRYPT_EMAIL=$(echo "$LETSENCRYPT_EMAIL" | tr -d '[:space:]')
    if [ -z "$LETSENCRYPT_EMAIL" ]; then
        error "Email is required for Let's Encrypt."
        exit 1
    fi

    # Generate cryptographic secrets
    SECRET_KEY=$(openssl rand -hex 32)
    ENCRYPTION_SALT=$(openssl rand -hex 16)

    # Write .env
    cat > .env <<ENVEOF
# ═══════════════════════════════════════════════════════════
#  Driftlock Configuration — Generated $(date -u +"%Y-%m-%d %H:%M UTC")
#  DO NOT share this file — it contains secrets
# ═══════════════════════════════════════════════════════════

# ── Core ──────────────────────────────────────────────────
ENVIRONMENT=production
SECRET_KEY=${SECRET_KEY}
DOMAIN=${DOMAIN}
SERVER_URL=https://${DOMAIN}

# ── Admin Account ─────────────────────────────────────────
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# ── JWT ───────────────────────────────────────────────────
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Database ──────────────────────────────────────────────
DATABASE_URL=sqlite+aiosqlite:////app/data/driftlock.db

# ── Encryption (AES-256 key derivation) ───────────────────
ENCRYPTION_SALT=${ENCRYPTION_SALT}

# ── CORS ──────────────────────────────────────────────────
CORS_ORIGINS=https://${DOMAIN}

# ── Rate Limiting ─────────────────────────────────────────
UPDATE_RATE_LIMIT=60/minute
LOGIN_RATE_LIMIT=5/minute

# ── Agent ─────────────────────────────────────────────────
AGENT_VERSION=1.0.0
ENVEOF

    chmod 600 .env
    success ".env created (permissions: 600)"

    # Save email for later (not in .env — only needed for certbot)
    echo "$LETSENCRYPT_EMAIL" > .letsencrypt-email
    chmod 600 .letsencrypt-email
fi

# Read email back if exists
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
if [ -z "$LETSENCRYPT_EMAIL" ] && [ -f .letsencrypt-email ]; then
    LETSENCRYPT_EMAIL=$(cat .letsencrypt-email)
fi
if [ -z "$LETSENCRYPT_EMAIL" ]; then
    read -r -p "  📧 Email for SSL certificate: " LETSENCRYPT_EMAIL
fi

# ═══════════════════════════════════════════════════════════
#  STEP 4: Build Frontend
# ═══════════════════════════════════════════════════════════
step "Step 4/7: Build Frontend"

info "Building React frontend (this may take 1-2 minutes on first run)..."
$DOCKER compose run --rm frontend
success "Frontend built and output copied to volume"

# ═══════════════════════════════════════════════════════════
#  STEP 5: Start Services (HTTP-only for cert issuance)
# ═══════════════════════════════════════════════════════════
step "Step 5/7: Start Services"

# Pass DOMAIN to nginx for envsubst template processing
export DOMAIN

# Stop any existing containers
$DOCKER compose down 2>/dev/null || true

# Start backend + nginx (HTTP only initially)
info "Starting backend and nginx..."
$DOCKER compose up -d --build nginx backend

# Wait for services to be healthy
info "Waiting for services to start..."
ATTEMPTS=0
MAX_ATTEMPTS=30
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if $DOCKER compose exec -T backend curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 2
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
    warn "Backend health check timed out — continuing anyway"
    warn "Check logs: $DOCKER compose logs backend"
else
    success "Backend is healthy"
fi

# Verify nginx is serving on port 80
if curl -sf -o /dev/null http://localhost/.well-known/acme-challenge/ 2>/dev/null || \
   curl -sf -o /dev/null http://localhost/ 2>/dev/null; then
    success "Nginx is serving on port 80"
else
    warn "Nginx may not be responding on port 80 — certbot might fail"
    warn "Check: $DOCKER compose logs nginx"
fi

# ═══════════════════════════════════════════════════════════
#  STEP 6: Obtain SSL Certificate
# ═══════════════════════════════════════════════════════════
step "Step 6/7: SSL Certificate"

# Check if cert already exists
CERT_EXISTS=false
if $DOCKER compose run --rm certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    success "SSL certificate already exists for $DOMAIN"
    CERT_EXISTS=true
fi

if [ "$CERT_EXISTS" = false ]; then
    info "Requesting SSL certificate from Let's Encrypt..."
    info "Domain: $DOMAIN"
    info "Email: $LETSENCRYPT_EMAIL"
    echo ""

    if $DOCKER compose run --rm certbot \
        certonly --webroot -w /var/www/certbot \
        --email "$LETSENCRYPT_EMAIL" \
        --agree-tos --no-eff-email \
        --non-interactive \
        -d "$DOMAIN"; then
        success "SSL certificate obtained!"
    else
        echo ""
        error "SSL certificate request FAILED"
        echo ""
        echo "  Common causes:"
        echo "    1. Domain $DOMAIN does not point to this server's IP"
        echo "    2. Port 80 is blocked by your cloud provider's firewall"
        echo "    3. Let's Encrypt rate limit (5 certs/week per domain)"
        echo ""
        echo "  Check your DNS:  dig +short $DOMAIN"
        echo "  Your server IP:  $(curl -sf https://api.ipify.org || echo 'unknown')"
        echo ""
        echo "  After fixing, re-run the certbot step:"
        echo "    sudo docker compose run --rm certbot certonly --webroot -w /var/www/certbot --email $LETSENCRYPT_EMAIL --agree-tos --no-eff-email -d $DOMAIN"
        echo ""
        warn "Driftlock is running on HTTP only (no HTTPS)"
        warn "Dashboard: http://$DOMAIN"
        echo ""
        # Don't exit — HTTP still works
    fi
fi

# Reload nginx to pick up the SSL cert
info "Reloading nginx with SSL configuration..."
$DOCKER compose exec -T nginx nginx -s reload 2>/dev/null || \
    $DOCKER compose restart nginx 2>/dev/null || true
success "Nginx reloaded"

# ═══════════════════════════════════════════════════════════
#  STEP 7: Certbot Auto-Renewal Cron
# ═══════════════════════════════════════════════════════════
step "Step 7/7: Auto-Renewal"

CRON_JOB="0 3 * * * cd $(pwd) && $DOCKER compose run --rm certbot renew --webroot -w /var/www/certbot --quiet && $DOCKER compose exec -T nginx nginx -s reload > /dev/null 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "certbot renew"; then
    success "Certbot auto-renewal cron already exists"
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    success "Certbot auto-renewal cron installed (daily at 3am UTC)"
fi

# ═══════════════════════════════════════════════════════════
#  DONE
# ═══════════════════════════════════════════════════════════

# Determine actual URL
if $DOCKER compose run --rm certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    DASHBOARD_URL="https://${DOMAIN}"
else
    DASHBOARD_URL="http://${DOMAIN}"
fi

# Final health check
echo ""
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ═══════════════════════════════════════════"
echo "  ║                                         ║"
echo "  ║   🔒 Driftlock is live!                 ║"
echo "  ║                                         ║"
echo "  ═══════════════════════════════════════════"
echo -e "${NC}"
echo -e "  Dashboard:  ${BOLD}${DASHBOARD_URL}${NC}"
echo -e "  Username:   ${BOLD}${ADMIN_USERNAME}${NC}"
echo ""
echo "  ─────────────────────────────────────────"
echo ""
echo "  Next steps:"
echo "    1. Open ${DASHBOARD_URL} in your browser"
echo "    2. Log in with your admin credentials"
echo "    3. Go to Setup → paste your Cloudflare API token"
echo "    4. Add a service → Download an agent → Install it"
echo ""
echo "  Useful commands:"
echo "    View logs:       sudo docker compose logs -f"
echo "    Restart:         sudo docker compose restart"
echo "    Stop:            sudo docker compose down"
echo "    Update:          git pull && sudo docker compose up --build -d"
echo ""
echo -e "  ⭐ ${CYAN}github.com/shinchan1907/DriftLock${NC}"
echo ""
