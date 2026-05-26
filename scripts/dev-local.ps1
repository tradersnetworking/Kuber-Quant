# Local development on Windows — run from repo root: .\scripts\dev-local.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example — edit DATABASE_URL if needed."
}

Write-Host "Starting API + frontend (pnpm dev)..."
pnpm dev
