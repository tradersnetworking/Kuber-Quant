import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLE === "true",
  });

  initialized = true;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.withScope(scope => {
    if (context) scope.setContext("extra", context);
    Sentry.captureException(err);
  });
}

export { Sentry };
