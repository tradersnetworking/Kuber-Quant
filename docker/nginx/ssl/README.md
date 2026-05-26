# SSL certificates

Place your TLS files here for the nginx reverse proxy:

- `fullchain.pem` — certificate + chain
- `privkey.pem` — private key

## Let's Encrypt (Certbot on Ubuntu 24 VPS)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/
```

Then set `ENABLE_SSL=true` in `.env` and redeploy:

```bash
docker compose up -d --build
```
