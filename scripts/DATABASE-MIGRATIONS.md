# Database migrations (Phase 2)

Kuber Quant currently uses **Drizzle push + startup patches** for schema sync. Phase 2 adds versioned migrations as the target path for production.

## Current deploy (unchanged)

```bash
pnpm db:push          # apply schema from lib/db to PostgreSQL
# API startup also runs ensureDatabaseSchemaPatches (idempotent indexes/columns)
```

## Generate first migration (when ready to cut over)

```bash
# Ensure DATABASE_URL points at a dev/staging DB matching production shape
pnpm db:generate      # writes SQL to lib/db/drizzle/
pnpm db:migrate       # applies pending migrations
```

**Status:** Initial baseline migration at `lib/db/drizzle/0000_right_blink.sql`. CI smoke job uses `pnpm db:migrate` on a fresh Postgres instance. Commit `lib/db/drizzle/` when switching production from `db:push` to versioned migrations (after staging validation).

## Production checklist

1. Backup PostgreSQL before any schema change.
2. Run migrations (or `db:push` until migrations are checked in) on staging first.
3. Deploy API — startup patches verify indexes/columns.
4. Run smoke test: `node scripts/smoke-test.mjs https://your-api-host`
5. Set `BOOTSTRAP_USERS=false` and `REDIS_URL` in production.

## Notes

- Hot-path indexes are also applied via `ensureDatabaseSchemaPatches.ts` on API boot.
- The baseline migration creates the full schema; existing DBs that already use `db:push` should not re-run `0000` blindly — use on fresh databases or after a deliberate cutover plan.
