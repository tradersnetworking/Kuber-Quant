# Kuber Quant — Docker Production Deployment (Hostinger VPS / Ubuntu 24 LTS)

Production stack with **separate frontend + backend containers**, **PostgreSQL**, **Redis**, **Nginx reverse proxy**, **PM2**, health checks, logging, and SSL support.

## Architecture

```
Internet → Nginx (:80 / :443)
              ├── /api/*, /uploads/* → Backend (Node + PM2, :8080)
              └── /*                 → Frontend (Nginx static React build)
Backend → PostgreSQL (:5432 internal)
Backend → Redis (:6379 internal)
```

Only **Nginx** exposes ports to the host. Database and Redis are on the private Docker network.

| Container | Image / build | Role |
|-----------|---------------|------|
| `nginx` | nginx:1.27-alpine | Reverse proxy, SSL termination |
| `frontend` | `docker/frontend/Dockerfile` | React SPA (Vite build) |
| `backend` | `docker/backend/Dockerfile` | Express API via **PM2** |
| `postgres` | postgres:16-alpine | Primary database |
| `redis` | redis:7-alpine | Cache / sessions (ready for use) |

## Prerequisites

- **Hostinger VPS** with Ubuntu 24.04 LTS (or any Linux with Docker)
- Domain A record → VPS IP
- GitHub repo access (optional, for CI deploy)
- 2 GB+ RAM recommended for build

## 1. Install Docker on Ubuntu 24 VPS

SSH into your VPS:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

## 2. Clone and configure

```bash
git clone https://github.com/tradersnetworking/Kuber-Quant.git
cd Kuber-Quant
cp .env.docker.example .env
nano .env
```

**Required changes in `.env`:**

| Variable | Example |
|----------|---------|
| `APP_URL` | `https://kuberquant.com` |
| `API_URL` | `https://kuberquant.com` |
| `CORS_ORIGINS` | `https://kuberquant.com` |
| `POSTGRES_PASSWORD` | strong random password |
| `REDIS_PASSWORD` | strong random password |
| `SESSION_SECRET` | 32+ random characters |
| `ENCRYPTION_KEY` | 32+ random characters |
| `SMTP_USER` / `SMTP_PASS` | Hostinger email (outbound mail) |
| `SUPPORT_IMAP_USER` / `SUPPORT_IMAP_PASS` | Same mailbox for inbound support inbox sync (optional) |

## 3. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f nginx backend
```

Wait until all services show **healthy**.

## 4. Initialize database (first deploy only)

```bash
docker compose exec backend ./node_modules/.bin/pnpm run db:push
docker compose exec backend ./node_modules/.bin/pnpm run db:seed
```

**Do not run `db:seed` in production** after go-live — it creates demo accounts.

## 5. Verify

```bash
curl -s http://YOUR_VPS_IP/api/healthz
# {"status":"ok","postgres":"ok","redis":"ok"}
```

Open `http://YOUR_VPS_IP` in a browser.

## 6. Enable SSL (HTTPS)

### Option A — Let's Encrypt on VPS

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/
sudo chown $USER:$USER docker/nginx/ssl/*.pem
```

In `.env`:

```env
ENABLE_SSL=true
APP_URL=https://yourdomain.com
API_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

Redeploy:

```bash
docker compose up -d
```

### Option B — Hostinger SSL / Cloudflare

Terminate SSL at Cloudflare or Hostinger panel, proxy to VPS port 80, keep `ENABLE_SSL=false`.

## 7. GitHub Actions deploy (Hostinger VPS API)

### GitHub secrets

| Secret | Description |
|--------|-------------|
| `HOSTINGER_API_KEY` | hPanel → Profile → API |
| `POSTGRES_PASSWORD` | DB password |
| `REDIS_PASSWORD` | Redis password |
| `SESSION_SECRET` | Auth secret |
| `ENCRYPTION_KEY` | Encryption key |
| `SMTP_PASS` | Email password |

### GitHub variables

| Variable | Example |
|----------|---------|
| `HOSTINGER_VM_ID` | `123456` (from srv123456.hstgr.cloud) |
| `APP_URL` | `https://yourdomain.com` |
| `API_URL` | `https://yourdomain.com` |
| `CORS_ORIGINS` | `https://yourdomain.com` |

Push to `main` or run **Deploy to Hostinger VPS** workflow manually.

Or deploy from your machine:

```bash
cp .env.docker.example .env   # fill values
node --env-file=.env scripts/deploy-hostinger.mjs
```

## 8. Operations

### View logs

```bash
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f postgres
```

Logs rotate automatically (10 MB × 5 files per container).

### Restart

```bash
docker compose restart backend
docker compose up -d --build   # after code update
```

### Backup PostgreSQL

```bash
docker compose exec postgres pg_dump -U kuber kuber > backup-$(date +%F).sql
```

### Shell into backend

```bash
docker compose exec backend sh
pm2 list
pm2 logs
```

### Stop everything

```bash
docker compose down
```

Data persists in Docker volumes (`postgres_data`, `redis_data`, `uploads_data`, `logs_data`).

## 9. Payment webhooks

Configure in provider dashboards:

| Provider | URL |
|----------|-----|
| Razorpay | `https://yourdomain.com/api/payments/razorpay/webhook` |
| PhonePe | `https://yourdomain.com/api/payments/phonepe/callback` |
| PayU | `https://yourdomain.com/api/payments/payu/callback` |

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend unhealthy | `docker compose logs backend` — check DATABASE_URL / secrets |
| 502 from Nginx | Wait for backend healthcheck; verify `docker compose ps` |
| CORS errors | Match `CORS_ORIGINS` to exact browser URL (https, no trailing slash) |
| SSL won't start | Ensure `fullchain.pem` + `privkey.pem` exist in `docker/nginx/ssl/` |
| Build OOM on VPS | Add swap: `sudo fallocate -l 2G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |

## File reference

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Full production stack |
| `.env.docker.example` | Environment template |
| `docker/backend/Dockerfile` | API + PM2 |
| `docker/frontend/Dockerfile` | React static build |
| `docker/nginx/` | Reverse proxy + SSL |
| `ecosystem.docker.cjs` | PM2 process config |
| `scripts/docker-db-push.sh` | DB schema init helper |

## Hostinger Node.js Web Apps (non-Docker)

For shared Node.js hosting without Docker, see [DEPLOYMENT.md](./DEPLOYMENT.md).
