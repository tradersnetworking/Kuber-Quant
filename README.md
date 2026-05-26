# Kuber Quant

Institutional-grade algorithmic trading and wealth management platform.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind + Wouter |
| Backend | Node.js + Express |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT + OTP + 2FA |

## Quick start

```bash
pnpm install
cp .env.example .env
# Edit .env — set DATABASE_URL, SESSION_SECRET, ENCRYPTION_KEY

pnpm db:push
pnpm db:seed          # development only
pnpm dev              # API :8080 + Web :3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + frontend |
| `pnpm build` | Typecheck + build all packages |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm db:push` | Sync DB schema (dev) |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:seed` | Seed demo data (blocked in production) |
| `pnpm test` | Run unit tests |

## Production checklist

1. Set `SESSION_SECRET` and `ENCRYPTION_KEY` (min 32 chars each)
2. Set `NODE_ENV=production`
3. Use versioned migrations (`pnpm db:generate` + migrate) instead of `db:push-force`
4. Do **not** run `db:seed` in production
5. Configure SMTP, payment gateways, and `CORS_ORIGINS`

## Project structure

```
artifacts/
  api-server/       Express API
  trading-platform/ React frontend
lib/
  db/               Drizzle schema
  api-client-react/ Generated API hooks
  api-spec/         OpenAPI spec
scripts/            Seed + utilities
```

## Default dev accounts (after seed)

| Email | Password | Role |
|-------|----------|------|
| superadmin@kuberquant.com | superadmin123 | Super Admin |
| user@kuberquant.com | user123 | Investor |

Change these immediately in any shared environment.
