# Kuber Quant

Institutional-grade algorithmic trading and wealth management platform.

## Demo login (after `pnpm db:seed`)

Use these on **http://127.0.0.1:3000/login** (investor) or **/staff-login** (staff roles):

| Role | Email | Password | Login page |
|------|-------|----------|------------|
| Super Admin | superadmin@kuberquant.com | superadmin123 | `/staff-login` |
| Manager | manager@kuberquant.com | manager123 | `/staff-login` |
| Support | support@kuberquant.com | support123 | `/staff-login` |
| Investor | user@kuberquant.com | user123 | `/login` |

Change all passwords before any shared or production deployment.

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
pnpm setup            # creates .env from .env.example if missing
# Edit .env — set DATABASE_URL, SESSION_SECRET, ENCRYPTION_KEY

pnpm db:push
pnpm db:seed          # development only
pnpm dev              # API :8080 + Web :3000
```

**Windows:** `.\scripts\dev-local.ps1`

**Production-style local run:**

```bash
pnpm build
pnpm start            # loads .env automatically
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm setup` | Create `.env` from `.env.example` |
| `pnpm dev` | Start API + frontend |
| `pnpm build` | Build web + API for production |
| `pnpm hostinger:build` | Hostinger deploy build (install + build) |
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

| Role | Email | Password | Login |
|------|-------|----------|-------|
| Super Admin | superadmin@kuberquant.com | superadmin123 | `/staff-login` |
| Manager | manager@kuberquant.com | manager123 | `/staff-login` |
| Support | support@kuberquant.com | support123 | `/staff-login` |
| Investor | user@kuberquant.com | user123 | `/login` |

Change these immediately in any shared environment.

## Production (Docker on VPS)

See **[DEPLOYMENT-DOCKER.md](./DEPLOYMENT-DOCKER.md)** for the full multi-container setup (Nginx, PostgreSQL, Redis, PM2).

```bash
cp .env.docker.example .env
docker compose up -d --build
docker compose exec backend ./node_modules/.bin/pnpm run db:push
```

## Troubleshooting (local)

**`Cannot find module ... vite ... dist.js` (Internal Server Error)**  
Dependencies are corrupted. Run:

```bash
pnpm clean:install
pnpm dev
```

**Port already in use**  
Vite tries the next port (3001, 3002, …). Open the URL shown in the terminal, or stop other Node processes using ports 3000/8080.

**`DATABASE_URL must be set`**  
Run `pnpm setup`, edit `.env`, then `pnpm db:push`.
