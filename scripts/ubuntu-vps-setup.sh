#!/usr/bin/env bash
# Kuber Quant — one-time Ubuntu 24 VPS bootstrap (Docker production stack)
set -euo pipefail

echo "==> Kuber Quant VPS setup (Ubuntu + Docker)"

if [ "$(id -u)" -eq 0 ]; then
  echo "Run as a normal user with sudo, not root."
  exit 1
fi

sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. Log out and back in (or run: newgrp docker) before continuing."
fi

if [ ! -f .env ]; then
  cp .env.docker.example .env
  echo "Created .env from .env.docker.example — edit SMTP, secrets, and domain before starting."
fi

echo ""
echo "Next steps:"
echo "  1. nano .env   # set APP_URL, POSTGRES_PASSWORD, REDIS_PASSWORD, SESSION_SECRET, ENCRYPTION_KEY, SMTP_*"
echo "  2. docker compose up -d --build"
echo "  3. docker compose exec backend ./node_modules/.bin/pnpm run db:push"
echo "  4. curl -s http://127.0.0.1/api/healthz"
echo ""
echo "Mail: configure SMTP_USER/SMTP_PASS in .env, then test under Super Admin → Email & Communication."
