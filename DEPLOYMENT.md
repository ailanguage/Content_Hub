# Content Creator Hub — Deployment Guide

This guide walks through deploying the entire application stack on a self-hosted server using Docker Compose.

## Architecture

```
Internet
   │
   ▼
nginx (port 80/443, SSL termination)
   ├── /socket.io/    → ws-server:3001    (WebSocket, Socket.io)
   ├── /task-creator/  → task-creator:3003  (Vue + Express, task management)
   └── /*              → nextjs:3000        (Next.js, main app + API)
                            │
                            ▼
                        postgres:5432       (PostgreSQL 16)
```

Six Docker services: `postgres`, `nextjs`, `ws-server`, `task-creator`, `nginx`, `certbot`

### How services communicate

| From         | To        | How                                  | Auth                                       |
| ------------ | --------- | ------------------------------------ | ------------------------------------------ |
| Browser      | nextjs    | HTTPS via nginx (`/*`)               | JWT cookie (`auth_token`)                  |
| Browser      | ws-server | WSS via nginx (`/socket.io/`)        | JWT token in handshake                     |
| nextjs       | ws-server | Internal HTTP `POST /emit`           | `X-API-Key` header (`WS_INTERNAL_API_KEY`) |
| nextjs       | postgres  | TCP `DATABASE_URL`                   | Postgres user/password                     |
| task-creator | nextjs    | Internal HTTP `POST /api/tasks/sync` | `X-API-Key` header (`BACKEND_API_KEY`)     |
| certbot      | nginx     | Shared volume for SSL certs          | —                                          |

### Shared secrets (must match)

| Variable              | Used by                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `JWT_SECRET`          | nextjs (signs tokens) + ws-server (verifies tokens)               |
| `WS_INTERNAL_API_KEY` | nextjs (sends emit requests) + ws-server (validates requests)     |
| `BACKEND_API_KEY`     | task-creator (sends task sync) + nextjs (validates sync requests) |

---

## Prerequisites

- **Server**: Ubuntu 22.04+ (or Debian-based), minimum 2 vCPU, 4GB RAM, 50GB SSD
- **Docker Engine** 24+ and **Docker Compose** v2 (`docker compose` command)
- **Domain** with DNS A-record pointing to the server's public IP
- **Ports** 80 and 443 open in firewall

### Install Docker (if not installed)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then verify:
docker compose version
```

---

## Step-by-Step Deployment

### 1. Clone the repository

```bash
git clone <REPO_URL> /opt/contenthub
cd /opt/contenthub
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Edit `.env` and fill in **all required values**. Generate secrets:

```bash
# Generate and print secrets (copy these into .env)
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "WS_INTERNAL_API_KEY=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
echo "BACKEND_API_KEY=$(openssl rand -hex 32)"
```

Set `DOMAIN=yourdomain.com` in the `.env` file.

### 3. Set up SSL certificate (first time only)

```bash
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh
```

This script:

1. Replaces `DOMAIN_PLACEHOLDER` in `nginx/conf.d/default.conf` with your actual domain
2. Starts nginx in HTTP-only mode
3. Runs certbot to obtain SSL certs from Let's Encrypt
4. Switches nginx to HTTPS mode

### 4. Build and start all services

```bash
docker compose build
docker compose up -d
```

### 5. Set up the database (first deployment only)

Wait for postgres to be healthy:

```bash
docker compose exec postgres pg_isready -U contenthub
```

Apply the database schema (22 tables):

```bash
docker compose exec nextjs npx drizzle-kit push
```

Seed initial data (admin user, channels, tags, invite codes):

```bash
docker compose exec nextjs npx tsx src/db/seed.ts
```

**Or use the deploy script** which does steps 4-5 together:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh --fresh-db
```

### 6. Verify that everything works

```bash
# All services should show "healthy"
docker compose ps

# Health checks
curl https://yourdomain.com/api/health
# → {"status":"ok","db":"connected"}

# Check ws-server internally
docker compose exec ws-server node -e "fetch('http://localhost:3001/health').then(r=>r.json()).then(console.log)"
# → {"status":"ok","connections":0}
```

Open browser → `https://yourdomain.com` → login with:

- **Email**: `admin@creatorhub.local`
- **Password**: `admin123`

---

SSL chicken-and-egg — Nginx won't start without SSL certs, but certbot needs nginx to verify the domain. That's what init-letsencrypt.sh handles — run it first, before docker compose up -d.

## Service Details

### postgres

- **Image**: `postgres:16-alpine`
- **Data**: Persisted in Docker volume `pgdata`
- **Port**: 5432 (bound to localhost only, not exposed publicly)
- **DB name**: `contenthub`

### nextjs

- **Build**: `frontend/Dockerfile` (multi-stage, uses `output: "standalone"`)
- **Port**: 3000 (internal)
- **Role**: Main application — frontend UI + all API routes (auth, tasks, channels, etc.)
- **ORM**: Drizzle ORM with postgres-js driver
- **Build args**: `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_APP_URL` are baked into the client JS at build time

### ws-server

- **Build**: `ws-server/Dockerfile`
- **Port**: 3001 (internal)
- **Role**: Real-time WebSocket server (Socket.io)
- **Endpoints**: `GET /health`, `POST /emit` (internal API for broadcasting events)
- **Rooms**: `channel:{slug}` for channel messages, `user:{userId}` for notifications

### task-creator

- **Build**: `backend-task-creator/Dockerfile`
- **Port**: 3003 (internal)
- **Role**: Admin tool for creating tasks and syncing them to the main app
- **Endpoints**: `POST /api/presign` (OSS upload), serves Vue SPA in production
- **Build args**: `VITE_FRONTEND_URL` and `VITE_BACKEND_API_KEY` are baked into Vue client at build time

### nginx

- **Image**: `nginx:1.27-alpine`
- **Ports**: 80 (HTTP → redirect), 443 (HTTPS)
- **Role**: SSL termination, reverse proxy, WebSocket upgrade, static asset caching
- **Config**: `nginx/conf.d/default.conf`

### certbot

- **Image**: `certbot/certbot`
- **Role**: Auto-renews SSL certificates every 12 hours

---

## Common Operations

### Update code and redeploy

```bash
cd /opt/contenthub
git pull
docker compose build nextjs ws-server task-creator
docker compose up -d nextjs ws-server task-creator

# If there are database schema changes:
docker compose exec nextjs npx drizzle-kit push
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f nextjs
docker compose logs -f ws-server
docker compose logs -f nginx
```

### Restart a single service

```bash
docker compose restart nextjs
```

### Database backup

```bash
docker compose exec postgres pg_dump -U contenthub contenthub > backup_$(date +%Y%m%d).sql
```

### Database restore

```bash
docker compose exec -T postgres psql -U contenthub contenthub < backup_20260326.sql
```

### Rebuild a single service

```bash
docker compose build nextjs --no-cache
docker compose up -d nextjs
```

### Check SSL certificate expiry

```bash
docker compose exec nginx openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -enddate
```

---

## Troubleshooting

| Problem                    | Check                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------- |
| nginx won't start          | `docker compose logs nginx` — usually a missing SSL cert (run init-letsencrypt first) |
| nextjs can't connect to DB | Verify postgres is healthy: `docker compose ps postgres`                              |
| WebSocket not connecting   | Check `NEXT_PUBLIC_WS_URL` matches domain, check nginx proxies `/socket.io/`          |
| Task creator can't sync    | Verify `BACKEND_API_KEY` matches in both task-creator and nextjs env                  |
| 502 Bad Gateway            | Service hasn't started yet — check `docker compose logs <service>`                    |
| SSL cert not renewing      | Check certbot logs: `docker compose logs certbot`                                     |

---

## File Structure

```
contenthubproductdoc/
├── docker-compose.yml          # Orchestrates all 6 services
├── .env.example                # Environment variable template
├── .env                        # Actual secrets (DO NOT commit)
├── nginx/
│   ├── nginx.conf              # Base nginx config
│   └── conf.d/
│       └── default.conf        # Reverse proxy + SSL config
├── scripts/
│   ├── init-letsencrypt.sh     # First-time SSL setup
│   └── deploy.sh               # One-command deployment
├── frontend/                   # Next.js app (nextjs service)
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/db/seed.ts          # Database seed script
├── ws-server/                  # Socket.io server (ws-server service)
│   ├── Dockerfile
│   └── .dockerignore
└── backend-task-creator/       # Vue + Express (task-creator service)
    ├── Dockerfile
    └── .dockerignore
```
