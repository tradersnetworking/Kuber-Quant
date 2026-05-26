#!/bin/sh
set -eu

echo "[backend] Waiting for PostgreSQL at ${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}…"

until pg_isready -h "${POSTGRES_HOST:-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-kuber}" -d "${POSTGRES_DB:-kuber}" >/dev/null 2>&1; do
  sleep 2
done

echo "[backend] PostgreSQL is ready."

if [ "${REDIS_URL:-}" != "" ]; then
  echo "[backend] Redis configured at REDIS_URL (health checked via API)."
fi

mkdir -p /app/uploads/payment_proofs /app/uploads/kyc_documents /app/uploads/profile_images /app/uploads/branding /app/uploads/qr_codes /app/logs

echo "[backend] Starting API with PM2…"
exec pm2-runtime start /app/ecosystem.docker.cjs
