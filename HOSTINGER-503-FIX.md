# Fix 503 on kuberquant.com

**Build = OK** (logs show `Hostinger build complete`)  
**503 = app crashes on start** — missing env vars, or (on shared hosting) PostgreSQL cannot be reached at all.

Hostinger shared hosting only provides **MySQL**. Kuber Quant requires **PostgreSQL**.

---

## Shared hosting port restriction (critical)

Hostinger **shared Node.js hosting** blocks outbound connections to PostgreSQL ports **5432** and **6543**. Only these outbound ports are allowed: **21, 80, 443, 3306, 65002**.

| Approach | Works on shared hosting? |
|----------|--------------------------|
| External Supabase / Neon PostgreSQL | **No** — blocked at firewall |
| Hostinger MySQL (port 3306) | Technically reachable, but app is built for Postgres |
| PostgreSQL on Hostinger VPS (Docker) | **Yes** — DB runs on private Docker network |

**Do not keep changing `DATABASE_URL` on shared hosting** — the connection will always fail with `postgres:error` regardless of credentials or pooler settings.

**Correct path:** migrate to **Hostinger VPS** and run the existing Docker stack (Postgres + Redis + API + Nginx). See [VPS migration](#vps-migration-recommended) below and [DEPLOYMENT-DOCKER.md](./DEPLOYMENT-DOCKER.md).

---

## VPS migration (recommended)

The repo already ships a production Docker workflow. Shared hosting can stay as a static placeholder or be retired once DNS points to the VPS.

### 1. Provision VPS

1. Hostinger hPanel → **VPS** → create Ubuntu 24.04 instance (2 GB+ RAM recommended).
2. Note the VM ID (e.g. `srv123456` → `HOSTINGER_VM_ID=123456`).
3. Point domain A records (`kuberquant.com`, `kuberquant.in`) to the VPS IP.

### 2. Bootstrap Docker on the VPS

SSH into the VPS and run the helper from [DEPLOYMENT-DOCKER.md §1](./DEPLOYMENT-DOCKER.md#1-install-docker-on-ubuntu-24-vps):

```bash
git clone https://github.com/tradersnetworking/Kuber-Quant.git
cd Kuber-Quant
chmod +x scripts/ubuntu-vps-setup.sh && ./scripts/ubuntu-vps-setup.sh
cp .env.docker.example .env   # fill APP_URL, secrets, SMTP
docker compose up -d --build
docker compose exec backend ./node_modules/.bin/pnpm run db:migrate
```

### 3. Enable CI deploy (optional)

Configure GitHub Actions per [DEPLOYMENT-DOCKER.md §7](./DEPLOYMENT-DOCKER.md#7-github-actions-deploy-hostinger-vps-api):

- Secret `HOSTINGER_API_KEY`, `POSTGRES_PASSWORD`, `SESSION_SECRET`, etc.
- Variable `HOSTINGER_VM_ID`, `APP_URL`, `API_URL`, `CORS_ORIGINS`

Push to `main` triggers `.github/workflows/deploy-hostinger.yml` (Docker Compose deploy via Hostinger VPS API).

### 4. Verify and cut over

```bash
curl -s https://kuberquant.com/api/health
# expect: {"status":"ok","postgres":"ok",...}
```

Enable SSL per [DEPLOYMENT-DOCKER.md §6](./DEPLOYMENT-DOCKER.md#6-enable-ssl-https). Disable or remove the shared Node.js app in hPanel once traffic is on the VPS.

---

## Step 1 — Create PostgreSQL (~2 min) — VPS / Docker only

On **VPS**, use the bundled Postgres container (see [DEPLOYMENT-DOCKER.md](./DEPLOYMENT-DOCKER.md)) — no external DB needed.

For a **managed** Postgres (optional, e.g. if DB is off-box on the VPS network), use one of these providers. **Not usable from shared Node.js hosting** (port block).

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

## Step 2 — Import environment variables in hPanel (shared hosting — DB will still fail)

> **Warning:** Shared hosting cannot reach external PostgreSQL. Use this section only for non-DB env vars during transition, or skip entirely and deploy on VPS.

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

- https://kuberquant.com/api/health → `{"status":"ok","postgres":"ok"}` (requires VPS + Docker)
- If you still see **503** on shared hosting after env changes, that is expected — migrate to VPS instead of retrying `DATABASE_URL`.
- https://kuberquant.com/staff-login

Staff login after seed: `superadmin@kuberquant.com` / `superadmin123` — change immediately.
