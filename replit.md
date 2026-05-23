# Kuber Capital

A full-stack, production-ready trading investment and wealth management platform. Premium hedge-fund dark/gold design with multi-role access, MT5 integration, KYC, crypto payments, referral system, copy trading, and algo trading.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT auth (`SESSION_SECRET` env)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, shadcn/ui, Tailwind CSS, framer-motion, recharts

## Where things live

- DB schema: `lib/db/src/schema/index.ts`
- API routes: `artifacts/api-server/src/routes/`
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- Generated hooks: `lib/api-client-react/src/generated/api.ts`
- Frontend pages: `artifacts/trading-platform/src/pages/`
- Theme/CSS vars: `artifacts/trading-platform/src/index.css`

## Architecture decisions

- JWT-based auth with role checks (`user`, `manager`, `admin`). Token stored in localStorage.
- All API mutations use `{data: body}` wrapper format (Orval codegen convention).
- Hook query options passed as `{ query: { enabled: ... } as any }` to avoid react-query v5 queryKey type requirement.
- `(req as any).user` pattern used throughout for JWT payload access in Express.
- Manager role can view/manage their assigned clients; admin has full platform access.

## Product

### User Features
- **Dashboard** — portfolio overview, balance cards, KYC status banner
- **Wallet** — fiat & crypto balances, deposit/withdraw, internal transfer
- **Investment Plans** — Starter/Growth/Premium/Elite plans with ROI info
- **Copy Trading** — mirror expert trader strategies
- **Algo Trading / EA Strategies** — automated trading systems
- **MT5 Accounts** — connect MetaTrader 5 broker accounts
- **KYC Verification** — multi-step ID verification flow
- **Referral Program** — earn commission on referred users
- **Support Tickets** — create and track support requests
- **Notifications** — real-time platform notifications

### Manager Features
- Client dashboard with stats
- KYC queue review
- Pending transaction monitoring
- Client management

### Admin Features
- Full user management with wallet adjustments
- KYC approval/rejection
- Investment plan CRUD
- Referral stats and top referrers
- Support ticket management
- Platform-wide analytics

## Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kubercapital.com | admin123 |
| Manager | manager@kubercapital.com | manager123 |

## Investment Plans (seeded)

| Plan | Min | Max | ROI | Duration |
|------|-----|-----|-----|----------|
| Starter | $100 | $5,000 | 5% | 30 days |
| Growth | $5,000 | $25,000 | 12% | 60 days |
| Premium | $25,000 | $100,000 | 22% | 90 days |
| Elite | $100,000 | $1,000,000 | 36% | 180 days |

## User preferences

- Brand: "Kuber Capital" — dark navy (`#050A14`) + gold/amber accent (`#D4AF37`, amber-500)
- No teal/cyan — all accents must be gold/amber
- Glassmorphism cards: `bg-white/5 backdrop-blur-sm border border-white/10`
- Gold gradient: `bg-gradient-to-r from-amber-400 to-yellow-600`

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before editing frontend
- Run `pnpm --filter @workspace/db run push` after any DB schema change
- `pnpm run typecheck:libs` must pass before `pnpm run typecheck` (libs are composite, apps are leaf)
- JWT secret in `auth.ts` is `kubercapital-secret-key` — change for production
- Orval mutations require `{ data: body }` wrapper format

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
