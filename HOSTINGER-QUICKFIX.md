# Hostinger — GitHub deploy (npm only)

Hostinger must use **npm**, not Corepack pnpm (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`).

## hPanel (GitHub connected)

| Setting | Value |
|---------|--------|
| Branch | `main` |
| Package manager | **`npm`** |
| Entry file | `server.cjs` |
| Node.js | 20.x |

Default `npm install` + `npm run build` work — no custom commands needed.

Import env vars from **`hostinger.env.example`**.

Full guide: [DEPLOYMENT-HOSTINGER-GIT.md](./DEPLOYMENT-HOSTINGER-GIT.md)
