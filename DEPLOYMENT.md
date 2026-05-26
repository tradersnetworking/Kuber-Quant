# Kuber Quant — Hostinger Deployment Guide

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

## 3. Install & Build

Hostinger **must not use Corepack** for pnpm (it fails with `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` on alt-nodejs).

In **hPanel → Node.js** set:

| Field | Value |
|-------|--------|
| **Install command** | `node scripts/hostinger-install.mjs` |
| **Build command** | `HOSTINGER_SKIP_INSTALL=1 node scripts/hostinger-build.mjs` |

Or use a **single build command** (install + build):

```bash
node scripts/hostinger-build.mjs
```

Manual SSH equivalent:

```bash
corepack disable
npm install -g pnpm@9.15.0
pnpm install --frozen-lockfile
pnpm run build:prod
```

## 4. Start with PM2

```bash
npm install -g pm2
mkdir -p logs uploads/payment_proofs uploads/kyc_documents uploads/profile_images
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 5. Hostinger Node.js Panel

In hPanel → Websites → Node.js:

- **Application root**: project root
- **Application startup file**: `artifacts/api-server/dist/index.mjs`
- **Node.js version**: 20 or 22

The API serves both `/api/*` routes and the built React frontend in production.

## 6. SSL & Domain

Enable free SSL in Hostinger. Set `APP_URL` and `CORS_ORIGINS` to `https://yourdomain.com`.

## 7. Payment Gateway Webhooks

Configure webhook URLs in each provider dashboard:

| Provider | Webhook URL |
|----------|-------------|
| Razorpay | `https://yourdomain.com/api/payments/razorpay/webhook` |
| PhonePe | `https://yourdomain.com/api/payments/phonepe/callback` |
| PayU | `https://yourdomain.com/api/payments/payu/callback` |

## 8. Default Admin Credentials

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@kuberquant.com | superadmin123 |
| Admin | admin@kuberquant.com | admin123 |
| Manager | manager@kuberquant.com | manager123 |
| User | user@kuberquant.com | user123 |

**Change all passwords immediately after first login.**

## 9. Backups

Schedule daily PostgreSQL dumps via Hostinger cron:

```bash
pg_dump $DATABASE_URL > /home/user/backups/kuber-$(date +%F).sql
```

## 10. Troubleshooting

- **502 errors**: Check PM2 logs with `pm2 logs kuber-quant-api`
- **DB connection**: Verify `DATABASE_URL` and firewall rules
- **Uploads**: Ensure `uploads/` directory is writable
- **CORS**: Match `CORS_ORIGINS` exactly to your domain
