# Printly Coding Instructions

This repository contains two main projects:

- **Frontend (Next.js + Cloudflare)**: `src/app` — Running Next.js with `@opennextjs/cloudflare`.
- **Backend (.NET + Cloudflare)**: `src/server` — ASP.NET Core Web API using Entity Framework Core. Powered by Cloudflare Workers via `src/server-worker`.

## Development Commands

These commands assume that you are in the workspace root.

### Build Server

```pwsh
dotnet build src/server/PrintlyServer.csproj --configuration Debug
```

### Run Migrations

```pwsh
pwsh -ExecutionPolicy Bypass -File src/server/migrate.ps1
pwsh -ExecutionPolicy Bypass -File src/server/migrate.ps1 -MigrationName Migration # To add a migration
```

### Frontend Commands

```pwsh
cd src/app
pnpm install
pnpm dev # Runs `next dev --turbopack`
pnpm run cf:gen # Generate Cloudflare types
```

## Project Patterns

- Dependency and middleware setup lives in `src/server/Extensions` (e.g. `ServiceExtensions.cs`, `AppExtensions.cs`). Prefer editing these for global DI/middleware changes.

## Important Points

- The script file for `src/server/migrate.ps1` requires `.env.production` to be present for migrations in the backend project.
- The frontend calls the API controllers exposed by the backend; changes to controller routes require frontend updates and possibly migration updates.
