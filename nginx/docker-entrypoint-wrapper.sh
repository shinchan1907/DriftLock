#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────
#  Driftlock Nginx Entrypoint Wrapper
#
#  Problem: The SSL template references cert files that don't
#  exist until certbot has run. If we process the SSL template
#  and include it, nginx refuses to start.
#
#  Solution: Before the official entrypoint runs envsubst,
#  check if the SSL cert exists. If not, remove the SSL
#  template so it's not processed. Nginx will start HTTP-only.
#  After certbot obtains the cert, `nginx -s reload` picks
#  up the SSL config (re-processed by a reload).
# ─────────────────────────────────────────────────────────

DOMAIN="${DOMAIN:-localhost}"

# Check if SSL cert exists
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "⚠ SSL cert not found for ${DOMAIN} — starting HTTP-only"
    # Remove the SSL template so envsubst doesn't process it
    rm -f /etc/nginx/templates/driftlock-ssl.conf.template
else
    echo "✓ SSL cert found for ${DOMAIN} — enabling HTTPS"
fi

# Hand off to the official nginx entrypoint
# This runs envsubst on remaining templates and starts nginx
exec /docker-entrypoint.sh "$@"
