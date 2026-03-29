#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# Content Creator Hub — First-time server setup
# Run on a fresh Ubuntu 22.04+ server as a user with sudo access.
#
# Usage:
#   curl -sL <raw-url>/scripts/setup.sh | bash
#   — or —
#   ./scripts/setup.sh
#
# What it does:
#   1. Installs Docker, Docker Compose, fail2ban, ufw
#   2. Hardens SSH (key-only, no root, rate limiting)
#   3. Configures firewall (22, 80, 443 only)
#   4. Creates deployment directory
#   5. Generates .env with cryptographic secrets
#   6. Prompts for remaining config values
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }
step()  { echo -e "\n${GREEN}=== $1 ===${NC}"; }

DEPLOY_DIR="${DEPLOY_DIR:-/opt/contenthub}"

# ── Must run with sudo available ──
if ! sudo -n true 2>/dev/null; then
  echo "This script needs sudo. You may be prompted for your password."
fi

# ═════════════════════════════════════════
# 1. Install system packages
# ═════════════════════════════════════════
step "1/6 Installing system packages"

sudo apt-get update -qq
sudo apt-get install -y -qq docker.io docker-compose-v2 fail2ban ufw git openssl > /dev/null 2>&1
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
info "Docker, fail2ban, ufw, git installed"

# ═════════════════════════════════════════
# 2. Harden SSH
# ═════════════════════════════════════════
step "2/6 Hardening SSH"

sudo tee /etc/ssh/sshd_config.d/90-hardened.conf > /dev/null <<'EOF'
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
MaxAuthTries 3
MaxSessions 3
LoginGraceTime 30
GSSAPIAuthentication no
KerberosAuthentication no
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
EOF

# Add AllowUsers for current user
echo "AllowUsers $USER" | sudo tee -a /etc/ssh/sshd_config.d/90-hardened.conf > /dev/null

sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 3

[sshd]
enabled  = true
port     = ssh
backend  = systemd
maxretry = 3
bantime  = 3600
findtime = 600
EOF

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
sudo sshd -t && sudo systemctl restart ssh
info "SSH hardened: key-only, no root, fail2ban active"

# ═════════════════════════════════════════
# 3. Configure firewall
# ═════════════════════════════════════════
step "3/6 Configuring firewall"

sudo ufw --force reset > /dev/null 2>&1
sudo ufw default deny incoming > /dev/null 2>&1
sudo ufw default allow outgoing > /dev/null 2>&1
sudo ufw allow 22/tcp > /dev/null 2>&1
sudo ufw allow 80/tcp > /dev/null 2>&1
sudo ufw allow 443/tcp > /dev/null 2>&1
sudo ufw --force enable > /dev/null 2>&1
info "UFW firewall: only 22, 80, 443 open"

# ═════════════════════════════════════════
# 4. Passwordless sudo for deploy commands
# ═════════════════════════════════════════
step "4/6 Configuring sudo"

sudo tee /etc/sudoers.d/"$USER"-ops > /dev/null <<EOF
$USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /usr/bin/apt-get, /usr/bin/apt, /usr/sbin/ufw
EOF
sudo chmod 440 /etc/sudoers.d/"$USER"-ops
sudo visudo -cf /etc/sudoers.d/"$USER"-ops
info "Passwordless sudo for docker/apt/ufw"

# ═════════════════════════════════════════
# 5. Create deployment directory
# ═════════════════════════════════════════
step "5/6 Setting up deployment directory"

sudo mkdir -p "$DEPLOY_DIR"
sudo chown "$USER":"$USER" "$DEPLOY_DIR"
info "Created $DEPLOY_DIR"

# ═════════════════════════════════════════
# 6. Generate .env
# ═════════════════════════════════════════
step "6/6 Generating environment file"

if [ -f "$DEPLOY_DIR/.env" ]; then
  warn ".env already exists at $DEPLOY_DIR/.env — skipping generation"
  warn "To regenerate, delete it and re-run this script"
else
  # Generate cryptographic secrets
  PG_PASS=$(openssl rand -hex 24)
  JWT=$(openssl rand -hex 32)
  WS_KEY=$(openssl rand -hex 32)
  BACKEND_KEY=$(openssl rand -hex 32)

  # Prompt for domain
  echo ""
  read -rp "Domain name (e.g. example.com): " DOMAIN
  [ -z "$DOMAIN" ] && { err "Domain is required"; exit 1; }

  cat > "$DEPLOY_DIR/.env" <<ENVEOF
# ═══════════════════════════════════════════
# Content Creator Hub — Production
# Generated on $(date -u +%Y-%m-%dT%H:%M:%SZ)
# ═══════════════════════════════════════════

# ─── Domain ───
DOMAIN=$DOMAIN

# ─── PostgreSQL ───
POSTGRES_USER=contenthub
POSTGRES_PASSWORD=$PG_PASS

# ─── Auth ───
JWT_SECRET=$JWT
WS_INTERNAL_API_KEY=$WS_KEY

# ─── Aliyun OSS (file uploads) ───
OSS_REGION=oss-ap-southeast-1
OSS_BUCKET=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_ENDPOINT=
OSS_BUCKET_DOMAIN=

# ─── Aliyun SMS ───
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=

# ─── Email (Resend) ───
RESEND_API_KEY=
EMAIL_FROM=Content Creator Hub <noreply@$DOMAIN>

# ─── LLM (AI features) ───
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=qwen3-max

# ─── Backend Integration ───
BACKEND_API_KEY=$BACKEND_KEY
BACKEND_WEBHOOK_URL=
BACKEND_CORS_ORIGIN=
ENVEOF

  chmod 600 "$DEPLOY_DIR/.env"
  info "Generated $DEPLOY_DIR/.env with cryptographic secrets"
  warn "Edit $DEPLOY_DIR/.env to fill in OSS, SMS, email, and LLM values"
fi

# ═════════════════════════════════════════
echo ""
echo -e "${GREEN}=== Setup complete! ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit $DEPLOY_DIR/.env with your service credentials"
echo "  2. Clone or copy your code to $DEPLOY_DIR"
echo "  3. Run: cd $DEPLOY_DIR && ./scripts/deploy.sh --fresh-db"
echo ""
echo "The deploy script handles everything: SSL, builds, DB, and startup."
