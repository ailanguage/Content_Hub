# Content Creator Hub — Deployment Guide

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

## Quick Start (first-time deploy)

### 1. Provision the server

On a fresh Ubuntu 22.04+ server:

```bash
# Upload and run the setup script
scp scripts/setup.sh user@server:/tmp/
ssh user@server 'bash /tmp/setup.sh'
```

This installs Docker, hardens SSH, configures firewall, and generates `.env` with cryptographic secrets.

### 2. Deploy the code

```bash
# Copy code to server
rsync -avz --exclude='node_modules' --exclude='.env' --exclude='.git' ./ user@server:/opt/contenthub/

# SSH in and deploy
ssh user@server
cd /opt/contenthub

# Edit .env with your service credentials (OSS, SMS, email, LLM)
nano .env

# Deploy everything (SSL + DB init + seed)
./scripts/deploy.sh --ssl
```

That's it. One command handles: nginx config generation, Docker builds, SSL certificates, service startup, DB schema push, and seeding.

### 3. Log in

Open `https://yourdomain.com` and log in with:

- **Email**: `admin@creatorhub.local`
- **Password**: `admin123`

**Change the admin password immediately.**

---

## Environment File

### Encryption

The `.env` file contains secrets and is gitignored. To store it safely in git:

```bash
# Encrypt (safe to commit the .enc file)
./scripts/env-crypt.sh encrypt

# Decrypt on a new server
./scripts/env-crypt.sh decrypt
```

The deploy script auto-detects `.env.enc` and prompts for the password if `.env` is missing.

### Required variables

| Variable              | How to generate                |
| --------------------- | ------------------------------ |
| `DOMAIN`              | Your domain name               |
| `POSTGRES_PASSWORD`   | `openssl rand -hex 24`         |
| `JWT_SECRET`          | `openssl rand -hex 32`         |
| `WS_INTERNAL_API_KEY` | `openssl rand -hex 32`         |

### Optional variables

| Variable              | Service   | Purpose                   |
| --------------------- | --------- | ------------------------- |
| `OSS_*`               | Aliyun    | File uploads              |
| `SMS_*`               | Aliyun    | SMS verification          |
| `RESEND_API_KEY`      | Resend    | Email sending             |
| `LLM_*`               | OpenRouter/etc | AI training features |
| `BACKEND_*`           | Task sync | Backend integration       |

---

## Nginx Config

The nginx config uses a **template** (`nginx/conf.d/default.conf.template`) with `${DOMAIN}` placeholders. The deploy script generates the actual `default.conf` at deploy time. The generated file is gitignored — **no domain names in tracked code**.

Features:
- `www` → root domain redirect (both HTTP and HTTPS)
- HTTP → HTTPS redirect
- Let's Encrypt ACME challenge support
- WebSocket upgrade for Socket.io
- Static asset caching (365 days for `_next/static`)
- Security headers (HSTS, X-Frame-Options, etc.)
- 50MB upload limit

---

## Deploy Commands

```bash
# First time (SSL + auto seeds)
./scripts/deploy.sh --ssl

# Update code (rebuild and restart)
./scripts/deploy.sh

# Update code + force DB schema push
./scripts/deploy.sh --migrate
```

Seed runs automatically on first deploy only (tracked by `.seed_completed` marker). To force re-seed, delete the marker file.

## Common Operations

### Update and redeploy

```bash
cd /opt/contenthub
git pull
./scripts/deploy.sh
```

### View logs

```bash
docker compose logs -f              # All services
docker compose logs -f nextjs       # Specific service
```

### Database backup / restore

```bash
# Backup
docker compose exec postgres pg_dump -U contenthub contenthub > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U contenthub contenthub < backup.sql
```

### Check SSL certificate expiry

```bash
docker compose exec nginx openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -enddate
```

---

## Troubleshooting

| Problem                    | Check                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------- |
| nginx won't start          | `docker compose logs nginx` — usually a missing SSL cert (run with `--ssl` first)     |
| nextjs can't connect to DB | Verify postgres is healthy: `docker compose ps postgres`                              |
| WebSocket not connecting   | Check `NEXT_PUBLIC_WS_URL` matches domain, check nginx proxies `/socket.io/`          |
| Task creator can't sync    | Verify `BACKEND_API_KEY` matches in both task-creator and nextjs env                  |
| 502 Bad Gateway            | Service hasn't started yet — check `docker compose logs <service>`                    |
| SSL cert not renewing      | Check certbot logs: `docker compose logs certbot`                                     |

---

## File Structure

```
contenthub/
├── docker-compose.yml                  # Orchestrates all 6 services
├── .env.example                        # Environment variable template
├── .env                                # Actual secrets (gitignored)
├── .env.enc                            # Encrypted secrets (safe to commit)
├── nginx/
│   ├── nginx.conf                      # Base nginx config
│   └── conf.d/
│       ├── default.conf.template       # Nginx template (tracked)
│       └── default.conf                # Generated at deploy (gitignored)
├── scripts/
│   ├── setup.sh                        # First-time server setup
│   ├── deploy.sh                       # Build, SSL, start, DB
│   └── env-crypt.sh                    # Encrypt/decrypt .env
├── frontend/                           # Next.js (nextjs service)
├── ws-server/                          # Socket.io (ws-server service)
└── backend-task-creator/               # Vue + Express (task-creator service)
```
