#!/bin/bash
set -euo pipefail

echo "🔒 Driftlock Bootstrap"
echo "─────────────────────────────────────────"

# 1. System update + install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# 2. Prompts
read -p "Enter your domain name (e.g. drift.myhost.com): " DOMAIN
read -p "Enter desired admin username: " ADMIN_USERNAME
read -s -p "Enter admin password: " ADMIN_PASSWORD
echo ""
read -p "Enter email for Let's Encrypt: " EMAIL

# 3. Generate Secrets
SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_SALT=$(openssl rand -hex 16)

# 4. Create .env
cat <<EOF > .env
ENVIRONMENT=production
SECRET_KEY=$SECRET_KEY
DOMAIN=$DOMAIN
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=sqlite+aiosqlite:////app/data/driftlock.db
ENCRYPTION_SALT=$ENCRYPTION_SALT
CORS_ORIGINS=https://$DOMAIN
UPDATE_RATE_LIMIT=60/minute
LOGIN_RATE_LIMIT=5/minute
AGENT_VERSION=1.0.0
EOF

echo "✓ .env file created"

# 5. Build Frontend
echo "Building frontend..."
docker compose run --rm frontend

# 6. Start Services (Initial - HTTP)
echo "Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 7. Obtain SSL
echo "Obtaining TLS certificate..."
docker compose run --rm certbot certonly --webroot -w /var/www/certbot --email "$EMAIL" --agree-tos --no-eff-email -d "$DOMAIN"

# 8. Reload Nginx
echo "Reloading Nginx with SSL..."
docker compose exec nginx nginx -s reload

echo "─────────────────────────────────────────"
echo "╔═══════════════════════════════════════╗"
echo "║   🔒 Driftlock is live!               ║"
echo "║   https://$DOMAIN                      ║"
echo "║   Admin: $ADMIN_USERNAME                ║"
echo "╚═══════════════════════════════════════╝"
