# Kuber Quant — Hostinger Deployment Guide

> **Docker VPS (recommended):** See **[DEPLOYMENT-DOCKER.md](./DEPLOYMENT-DOCKER.md)** for the production multi-container stack (Nginx, PostgreSQL, Redis, PM2).

## Prerequisites

- Hostinger Business Hosting with **Node.js** enabled
- PostgreSQL database (Hostinger VPS addon or external provider)
- Domain pointed to Hostinger
- SMTP email account on Hostinger

## 1. Upload Project

Upload the full monorepo to your Hostinger Node.js app directory (e.g. `/home/user/kuber-quant`).

## 2. Environment Setup

```bash
cp .env.example .env
nano .env
```

Set at minimum:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `SESSION_SECRET` | Random 32+ character string |
| `PORT` | Port assigned by Hostinger Node.js panel |
| `APP_URL` | `https://yourdomain.com` |
| `API_URL` | `https://yourdomain.com` |
| `CORS_ORIGINS` | `https://yourdomain.com` |
| `SMTP_*` | Hostinger mail credentials |

## 3. Hostinger Node.js Web Apps (hPanel)

In **Websites → Node.js Apps → your app → Settings**, use these values:

| Setting | Value |
|---------|--------|
| **Node.js version** | `20` |
| **Framework** | Express (or Other) |
| **Package manager** | **`npm`** — not pnpm (Corepack pnpm fails on Hostinger alt-nodejs) |
| **Install command** | `node scripts/hostinger-install.mjs` |
| **Build command** | `HOSTINGER_SKIP_INSTALL=1 node scripts/hostinger-build.mjs` |
| **Start command** | `node server.cjs` |
| **Entry / startup file** | `server.cjs` |
| **Output directory** | `artifacts/trading-platform/dist/public` |

Or use a **single build command** (install + build):

```bash
node scripts/hostinger-build.mjs
```

Then click **Redeploy**.

The install script bootstraps pnpm via npm and never uses Corepack, avoiding `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`.

### Required environment variables (hPanel → Environment)

Hostinger injects `PORT` automatically — do not override it with a fixed value.

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random 32+ character string |
| `ENCRYPTION_KEY` | Random 32+ character string |
| `APP_URL` | `https://yourdomain.com` |
| `API_URL` | `https://yourdomain.com` |
| `CORS_ORIGINS` | `https://yourdomain.com` |
| `SMTP_*` | Hostinger mail credentials |

After first deploy (SSH or Hostinger terminal if available):

```bash
node node_modules/pnpm/bin/pnpm.cjs run db:push
node node_modules/pnpm/bin/pnpm.cjs run db:seed
```

### Manual SSH equivalent

```bash
corepack disable
npm install pnpm@9.15.0 --no-save --no-package-lock
node node_modules/pnpm/bin/pnpm.cjs install --frozen-lockfile --config.minimumReleaseAge=0
node node_modules/pnpm/bin/pnpm.cjs run build:prod
node server.js
```

## 4. Hostinger VPS (optional — PM2 / Docker)

For VPS with SSH access instead of Node.js Web Apps:

```bash
npm install -g pm2
mkdir -p logs uploads/payment_proofs uploads/kyc_documents uploads/profile_images
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 5. Hostinger Node.js Panel (legacy note)

If your panel only has **startup file** and **Node version**:

- **Application root**: project root (where `package.json` and `server.cjs` live)
- **Application startup file**: `server.cjs`
- **Node.js version**: 20

`server.cjs` (CommonJS) is the Hostinger entry — lsnode uses `require()` and cannot load ESM `server.js`. It starts the Express API, which also serves the built React frontend in production. Use `node server.js` locally.

## 6. SSL & Domain

Enable free SSL in Hostinger. Set `APP_URL` and `CORS_ORIGINS` to `https://yourdomain.com`.

## 7. Payment Gateway Webhooks

Configure webhook URLs in each provider dashboard:

| Provider | Webhook URL |
|----------|-------------|
| Razorpay | `https://yourdomain.com/api/payments/razorpay/webhook` |
| PhonePe | `https://yourdomain.com/api/payments/phonepe/callback` |
| PayU | `https://yourdomain.com/api/payments/payu/callback` |

## 8. Default Staff Credentials

After seeding:

| Role | Email | Password | Login |
|------|-------|----------|-------|
| Super Admin | superadmin@kuberquant.com | superadmin123 | `/staff-login` |
| Manager | manager@kuberquant.com | manager123 | `/staff-login` |
| Support | support@kuberquant.com | support123 | `/staff-login` |
| Investor | user@kuberquant.com | user123 | `/login` |

**Change all passwords immediately after first login.**

## 9. Backups

Schedule daily PostgreSQL dumps via Hostinger cron:

```bash
pg_dump $DATABASE_URL > /home/user/backups/kuber-$(date +%F).sql
```

## 10. Troubleshooting

- **ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING**: Package manager is set to pnpm — change it to **npm** and set Install command to `node scripts/hostinger-install.mjs`, then redeploy.
- **Failed to install dependencies**: Same as above; never use Corepack pnpm on Hostinger.
- **502 errors**: Check deploy logs; confirm `PORT` is set by Hostinger (do not hardcode in env).
- **DB connection**: Verify `DATABASE_URL` and firewall rules
- **Uploads**: Ensure `uploads/` directory is writable
- **CORS**: Match `CORS_ORIGINS` exactly to your domain
