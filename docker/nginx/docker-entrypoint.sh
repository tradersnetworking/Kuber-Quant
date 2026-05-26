#!/bin/sh
set -eu

mkdir -p /var/www/certbot

# Default: HTTP-only config
cp /etc/nginx/conf.d-templates/app-http.conf /etc/nginx/conf.d/app.conf

# Enable HTTPS when certs are mounted and ENABLE_SSL=true
if [ "${ENABLE_SSL:-false}" = "true" ] \
  && [ -f /etc/nginx/ssl/fullchain.pem ] \
  && [ -f /etc/nginx/ssl/privkey.pem ]; then
  echo "[nginx] SSL certificates found — enabling HTTPS on port 443"
  cp /etc/nginx/conf.d-templates/app-ssl.conf /etc/nginx/conf.d/app-ssl.conf
  cat > /etc/nginx/conf.d/app.conf <<'EOF'
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
EOF
else
  echo "[nginx] Running HTTP-only (set ENABLE_SSL=true and mount certs for HTTPS)"
  rm -f /etc/nginx/conf.d/app-ssl.conf
fi

exec nginx -g 'daemon off;'
