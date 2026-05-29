# Legacy `/admin/*` routes

These pages are **not mounted** in the app router. `/admin` and `/admin/*` redirect to `/super-admin` via `AdminLegacyRedirect` in `App.tsx`.

**Active import:** only `settings/index.tsx` (`SiteSettingsContent`) is used by `SiteSettingsPanel`.

Do not add new routes here — use `/super-admin` panels instead.
