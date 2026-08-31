# Fix 503 on kuberquant.com

**Build = OK** (logs show `Hostinger build complete`)  
**503 = app crashes on start** — almost always missing `DATABASE_URL` and other env vars.

Hostinger shared hosting only provides **MySQL**. Kuber Quant requires **PostgreSQL**.

---

## Step 1 — Create free PostgreSQL (~2 min)

Hostinger shared hosting only provides MySQL. Use an external PostgreSQL provider.

### Option A — Supabase (recommended if you already use it)

1. Go to https://supabase.com and create a project
2. **Project Settings → Database → Connection string → URI**
3. URL-encode special characters in the password (`@` → `%40`, `#` → `%23`)
4. Use the direct connection (port 5432):

```
postgresql://postgres:YOUR_URL_ENCODED_PASSWORD@db.<project-ref>.supabase.co:5432/postgres
```

Example: project ref `pskrqbrlzbnwtaolpbkx` → host `db.pskrqbrlzbnwtaolpbkx.supabase.co`

### Option B — Neon

1. Go to https://neon.tech and sign up (free tier)
2. Create project: **kuber-quant**
3. Copy the connection string — looks like:

```
postgresql://neondb_owner:XXXX@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

4. Replace `/neondb` with `/kuber` in the URL if you create a database named `kuber`

---

## Step 2 — Import environment variables in hPanel

1. hPanel → **Websites** → **Node.js Apps** → **kuberquant.com**
2. **Environment Variables** → **Import .env**
3. Use `hostinger.env.example` from this repo
4. Edit **`DATABASE_URL`** = your Supabase or Neon connection string
5. Edit **`SMTP_USER`** / **`SMTP_PASS`** = your Hostinger email (optional for first boot)
6. **Do NOT add `PORT`** — Hostinger sets it
7. Click **Save** then **Redeploy**

---

## Step 3 — Initialize database (once)

After redeploy succeeds, open **SSH/Terminal** in hPanel:

```bash
cd ~/domains/kuberquant.com/hbuilds/source
node node_modules/pnpm/bin/pnpm.cjs run db:push
node node_modules/pnpm/bin/pnpm.cjs run db:seed
```

Then set `BOOTSTRAP_USERS=false` in env and redeploy again.

---

## Step 4 — Attach kuberquant.in

In hPanel → **Domains** → add **kuberquant.in** as alias to the same Node.js app, or set DNS A record to `2.57.91.91` (same as kuberquant.com).

---

## Required env vars (minimum)

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase or Neon PostgreSQL URL |
| `SESSION_SECRET` | 32+ random chars |
| `ENCRYPTION_KEY` | 32+ random chars |
| `APP_URL` | `https://kuberquant.com` |
| `API_URL` | `https://kuberquant.com` |
| `CORS_ORIGINS` | both .com and .in URLs |
| `BOOTSTRAP_USERS` | `true` (first deploy only) |

---

## Verify

- https://kuberquant.com/api/health → `{"status":"ok","postgres":"ok"}`
- https://kuberquant.com/staff-login

Staff login after seed: `superadmin@kuberquant.com` / `superadmin123` — change immediately.
