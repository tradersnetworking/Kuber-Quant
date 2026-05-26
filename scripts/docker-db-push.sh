#!/usr/bin/env sh
# Apply Drizzle schema to the Docker PostgreSQL database (run once after first deploy).
set -eu
cd "$(dirname "$0")/.."
docker compose exec backend ./node_modules/.bin/pnpm run db:push
echo "Database schema pushed."
