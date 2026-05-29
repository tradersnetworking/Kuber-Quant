#!/usr/bin/env sh
# Apply pending Drizzle migrations on Docker PostgreSQL (fresh database only).
# Do NOT run on production DBs already initialized via db:push — see scripts/DATABASE-MIGRATIONS.md
set -eu
cd "$(dirname "$0")/.."
docker compose exec backend ./node_modules/.bin/pnpm run db:migrate
echo "Database migrations applied."
