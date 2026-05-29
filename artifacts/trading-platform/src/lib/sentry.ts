import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLE === "true",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 0,
  });

  initialized = true;
}

export function captureException(err: unknown): void {
  if (!initialized) return;
  Sentry.captureException(err);
}

export { Sentry };
