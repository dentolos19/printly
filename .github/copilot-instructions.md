# Copilot Instructions

This repository contains two main projects and one helper project:

- `src/app`: The frontend application built with Next.js and hosted on Cloudflare.
- `src/server`: The backend server built with ASP.NET Core and Entity Framework Core.
- `src/server-worker`: A helper project that allows the backend to run on Cloudflare Workers.

## Requirements

- You must use pnpm as the package manager for the frontend application.
- Synchorize the backend controllers `src/server/Controllers` to the frontend connectors `src/app/src/lib/server`.

## Commands

These commands assume that you are in the workspace root.

### Build Server

```pwsh
cd src/server
dotnet restore
dotnet build --configuration Debug
```

### Run Server

```pwsh
cd src/app
pnpm install
pnpm run cf:gen
pnpm run dev
```

### Run Migrations

```pwsh
pwsh -ExecutionPolicy Bypass -File src/server/migrate.ps1
```

### Create Migration

```pwsh
pwsh -ExecutionPolicy Bypass -File src/server/migrate.ps1 -MigrationName MyMigration
```
