# Kuber Quant — API backend (PM2) for Docker / Ubuntu 24 VPS hosts
FROM node:20-bookworm-slim AS build

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@9.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile --config.minimumReleaseAge=0
RUN pnpm build:api

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates tini postgresql-client \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pm2@5.4.3

ENV NODE_ENV=production \
    PORT=8080 \
    SERVE_SPA=false \
    UPLOAD_DIR=/app/uploads

COPY --from=build /app /app
COPY ecosystem.docker.cjs /app/ecosystem.docker.cjs
COPY docker/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p uploads/payment_proofs uploads/kyc_documents uploads/profile_images uploads/branding uploads/qr_codes logs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/api/healthz || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/docker-entrypoint.sh"]
