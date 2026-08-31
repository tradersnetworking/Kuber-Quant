# Hostinger — fix `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`

This error means hPanel is running **Corepack pnpm** instead of the custom install script.

## Fix in hPanel (Node.js App → Settings)

| Setting | Must be |
|---------|---------|
| **Package manager** | **`npm`** — NOT pnpm |
| **Install command** | `node scripts/hostinger-install.mjs` |
| **Build command** | `HOSTINGER_SKIP_INSTALL=1 node scripts/hostinger-build.mjs` |
| **Start command** | `node server.js` |
| **Entry file** | `server.js` |
| **Node.js version** | `20` |

Then click **Redeploy**.

## Upload zip (recommended)

Use the zip from:

```bash
node scripts/package-hostinger-upload.mjs
```

That zip removes `packageManager` from `package.json` so Hostinger will not auto-detect pnpm.

## Why it fails

Hostinger `alt-nodejs` + Corepack pnpm 11.x crashes on Node 20. Our install script bootstraps pnpm via **npm** and runs `node node_modules/pnpm/bin/pnpm.cjs` directly — no Corepack.
