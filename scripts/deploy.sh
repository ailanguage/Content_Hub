#!/bin/bash
# Deploy Content Creator Hub
# Usage: ./scripts/deploy.sh [--fresh-db]

set -e

echo "=== Content Creator Hub Deployment ==="
echo ""

# Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found."
  echo "  cp .env.example .env"
  echo "  # Then fill in all REQUIRED values"
  exit 1
fi

source .env

# Validate required env vars
MISSING=""
[ -z "$DOMAIN" ] && MISSING="$MISSING DOMAIN"
[ -z "$POSTGRES_PASSWORD" ] && MISSING="$MISSING POSTGRES_PASSWORD"
[ -z "$JWT_SECRET" ] && MISSING="$MISSING JWT_SECRET"
[ -z "$WS_INTERNAL_API_KEY" ] && MISSING="$MISSING WS_INTERNAL_API_KEY"

if [ -n "$MISSING" ]; then
  echo "ERROR: Missing required environment variables:$MISSING"
  exit 1
fi

echo "[1/5] Building Docker images..."
docker compose build

echo "[2/5] Starting services..."
docker compose up -d

echo "[3/5] Waiting for postgres to be healthy..."
until docker compose exec postgres pg_isready -U "${POSTGRES_USER:-contenthub}" > /dev/null 2>&1; do
  sleep 2
done
echo "  Postgres is ready."

# Run DB setup if --fresh-db flag is passed
if [ "$1" = "--fresh-db" ]; then
  echo "[4/5] Setting up database (fresh)..."
  echo "  Pushing schema..."
  docker compose exec nextjs npx drizzle-kit push
  echo "  Running seed..."
  docker compose exec nextjs npx tsx src/db/seed.ts
else
  echo "[4/5] Skipping DB setup (use --fresh-db for first deployment)"
fi

echo "[5/5] Verifying services..."
sleep 5

echo ""
echo "Service status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Deployment complete! ==="
echo "App: https://$DOMAIN"
echo "Task Creator: https://$DOMAIN/task-creator/"
echo ""
echo "Default admin: admin@creatorhub.local / admin123"
