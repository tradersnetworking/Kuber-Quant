FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm build:prod

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=build /app /app

ENV NODE_ENV=production
ENV PORT=8080
ENV WEB_DIST=/app/artifacts/trading-platform/dist/public
ENV UPLOAD_DIR=/app/uploads

RUN mkdir -p uploads/payment_proofs uploads/kyc_documents uploads/profile_images logs

EXPOSE 8080

CMD ["node", "artifacts/api-server/dist/index.mjs"]
