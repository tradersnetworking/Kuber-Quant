# Kuber Quant — React frontend (static nginx) for Docker
FROM node:20-bookworm-slim AS build

WORKDIR /app
RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY artifacts ./artifacts
COPY lib ./lib

ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN pnpm install --frozen-lockfile --config.minimumReleaseAge=0
RUN pnpm build:web

FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/trading-platform/dist/public /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
