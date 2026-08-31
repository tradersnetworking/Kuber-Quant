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
- `node server.js` → starts the app (CommonJS entry for lsnode require())

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

Use **one** Node.js app and **one** database for both domains:

1. Deploy the Git app on **kuberquant.com** only (do not create a second Node.js app).
2. In hPanel → Websites → **kuberquant.com** → add **kuberquant.in** as a **parked / alias** domain (same `public_html` / same process).
3. Point **kuberquant.in** DNS to Hostinger CDN (same pattern as `.com`):
   - `@` → `ALIAS` → `kuberquant.in.cdn.hstgr.net`
   - `www` → `CNAME` → `www.kuberquant.in.cdn.hstgr.net`
4. Enable free SSL for `kuberquant.in` (and `www`) in hPanel.
5. Keep env shared on that single app:
   - `CORS_ORIGINS=https://kuberquant.com,https://www.kuberquant.com,https://kuberquant.in,https://www.kuberquant.in`
   - `APP_URL` / `API_URL` stay on the primary (`https://kuberquant.com`) for emails and payment return URLs
   - Same `DATABASE_URL`, uploads, SMTP, secrets — no duplicate resources

Primary URL: `https://kuberquant.com` · Alias: `https://kuberquant.in`

## 6. Troubleshooting

| Error | Fix |
|-------|-----|
| `ERR_REQUIRE_ASYNC_MODULE` / lsnode require() | Root `server.js` must be **CommonJS** (no `"type":"module"` in root `package.json`) |
| `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` | Package manager must be **npm**, not pnpm |
| `Missing frontend build` | Build step failed — check deploy logs for `npm run build` |
| DB connection error | Set valid `DATABASE_URL` |
| 502 | Missing env vars or app crash — check logs |

See also [HOSTINGER-QUICKFIX.md](./HOSTINGER-QUICKFIX.md).
