# Hostinger — deploy from GitHub

Connect **GitHub → Hostinger** so every push to `main` redeploys automatically.

## 1. hPanel settings

| Setting | Value |
|---------|--------|
| **Source** | GitHub → `tradersnetworking/Kuber-Quant` |
| **Branch** | `main` |
| **Framework** | Express |
| **Node.js version** | 20.x |
| **Root directory** | `./` |
| **Package manager** | **`npm`** (never pnpm) |
| **Entry file** | `server.js` |

No custom install/build commands needed — defaults work:

- `npm install` → runs `postinstall` (Hostinger-safe pnpm bootstrap)
- `npm run build` → compiles frontend + API
- `node server.js` → starts the app

## 2. Environment variables

Import **`hostinger.env.example`** in hPanel → Environment Variables → **Import .env**.

Edit before import:

- `DATABASE_URL` — PostgreSQL connection string
- `SMTP_USER` / `SMTP_PASS` — Hostinger email

Do **not** set `PORT` — Hostinger assigns it.

## 3. First deploy

1. Connect GitHub and deploy
2. After success, run once via SSH/terminal:

```bash
node node_modules/pnpm/bin/pnpm.cjs run db:push
node node_modules/pnpm/bin/pnpm.cjs run db:seed
```

3. Set `BOOTSTRAP_USERS=false` in env and redeploy

## 4. Updates from Git

Push to `main` on GitHub → Hostinger auto-redeploys:

```bash
git push origin main
```

Or click **Redeploy** in hPanel to pull latest `main` manually.

## 5. Domains (kuberquant.com + kuberquant.in)

Both domains are in `CORS_ORIGINS` in `hostinger.env.example`. Attach both in hPanel and enable SSL on each.

Primary URL: `https://kuberquant.com`

## 6. Troubleshooting

| Error | Fix |
|-------|-----|
| `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` | Package manager must be **npm**, not pnpm |
| `Missing frontend build` | Build step failed — check deploy logs for `npm run build` |
| DB connection error | Set valid `DATABASE_URL` |
| 502 | Missing env vars or app crash — check logs |

See also [HOSTINGER-QUICKFIX.md](./HOSTINGER-QUICKFIX.md).
