#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# .env encryption/decryption using AES-256-CBC
#
# Usage:
#   ./scripts/env-crypt.sh encrypt          # .env → .env.enc
#   ./scripts/env-crypt.sh decrypt          # .env.enc → .env
#   ./scripts/env-crypt.sh encrypt myfile   # custom input file
#   ./scripts/env-crypt.sh decrypt myfile   # custom encrypted file
#
# The encrypted file (.env.enc) is safe to commit to git.
# The plaintext .env is gitignored.
#
# Password is read from ENV_PASSWORD env var, or prompted interactively.
# ═══════════════════════════════════════════════════════════════

cd "$(dirname "$0")/.."

ACTION="${1:-}"
CUSTOM="${2:-}"

if [ -z "$ACTION" ] || { [ "$ACTION" != "encrypt" ] && [ "$ACTION" != "decrypt" ]; }; then
  echo "Usage: $0 <encrypt|decrypt> [file]"
  echo ""
  echo "  encrypt   Encrypt .env → .env.enc (safe to commit)"
  echo "  decrypt   Decrypt .env.enc → .env"
  exit 1
fi

# Get password
if [ -n "${ENV_PASSWORD:-}" ]; then
  PASS="$ENV_PASSWORD"
else
  read -rsp "Enter encryption password: " PASS
  echo ""
  if [ "$ACTION" = "encrypt" ]; then
    read -rsp "Confirm password: " PASS2
    echo ""
    if [ "$PASS" != "$PASS2" ]; then
      echo "Error: passwords don't match"
      exit 1
    fi
  fi
fi

if [ "$ACTION" = "encrypt" ]; then
  INPUT="${CUSTOM:-.env}"
  OUTPUT="${CUSTOM:-.env}.enc"

  if [ ! -f "$INPUT" ]; then
    echo "Error: $INPUT not found"
    exit 1
  fi

  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in "$INPUT" -out "$OUTPUT" -pass "pass:$PASS"

  echo "Encrypted: $INPUT → $OUTPUT"
  echo "The .enc file is safe to commit to git."

elif [ "$ACTION" = "decrypt" ]; then
  INPUT="${CUSTOM:-}.env.enc"
  [ -n "$CUSTOM" ] && INPUT="$CUSTOM"
  OUTPUT="${INPUT%.enc}"

  if [ ! -f "$INPUT" ]; then
    echo "Error: $INPUT not found"
    exit 1
  fi

  if [ -f "$OUTPUT" ]; then
    read -rp "$OUTPUT already exists. Overwrite? [y/N] " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
      echo "Aborted."
      exit 0
    fi
  fi

  openssl enc -aes-256-cbc -d -salt -pbkdf2 -iter 100000 \
    -in "$INPUT" -out "$OUTPUT" -pass "pass:$PASS"

  chmod 600 "$OUTPUT"
  echo "Decrypted: $INPUT → $OUTPUT"
fi
