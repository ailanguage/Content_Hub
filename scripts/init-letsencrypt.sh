#!/bin/bash
# First-time SSL certificate setup for Let's Encrypt
# Usage: ./scripts/init-letsencrypt.sh

set -e

# Load domain from .env
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and fill in values."
  exit 1
fi

source .env

if [ -z "$DOMAIN" ]; then
  echo "ERROR: DOMAIN not set in .env"
  exit 1
fi

EMAIL="${SSL_EMAIL:-admin@$DOMAIN}"

echo "=== SSL Setup for $DOMAIN ==="
echo "Email: $EMAIL"
echo ""

# Step 1: Update nginx config with actual domain
echo "[1/4] Updating nginx config with domain..."
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx/conf.d/default.conf

# Step 2: Create a temporary nginx config (HTTP only) for certbot challenge
echo "[2/4] Starting nginx in HTTP-only mode..."
cat > /tmp/nginx-http-only.conf << 'HTTPEOF'
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
HTTPEOF

# Temporarily use HTTP-only config
cp nginx/conf.d/default.conf /tmp/default.conf.bak
cp /tmp/nginx-http-only.conf nginx/conf.d/default.conf

docker compose up -d nginx

# Wait for nginx to start
sleep 3

# Step 3: Obtain certificate
echo "[3/4] Obtaining SSL certificate from Let's Encrypt..."
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

# Step 4: Restore full HTTPS config and reload
echo "[4/4] Enabling HTTPS..."
cp /tmp/default.conf.bak nginx/conf.d/default.conf

docker compose exec nginx nginx -s reload

echo ""
echo "=== SSL setup complete! ==="
echo "Certificate obtained for: $DOMAIN"
echo "You can now run: docker compose up -d"
