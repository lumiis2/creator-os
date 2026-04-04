# Simple local setup

## 1) Define env source of truth
Use root `.env` as the single source of truth for local values.

## 2) Sync app env files from root
```bash
cp .env.example .env
cp .env apps/web/.env.local
cp .env apps/worker/.env
```

## 3) Install deps
```bash
corepack enable
corepack prepare pnpm@8.15.6 --activate
pnpm install
```

## 4) Start local DB + Redis (optional)
```bash
docker run --name creatoros-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=creatoros -p 5432:5432 -d postgres:16
docker run --name creatoros-redis -p 6379:6379 -d redis:7
```

## 5) Migrate DB
```bash
pnpm --filter @creator-os/db exec drizzle-kit push
```

## 6) Run web + worker
```bash
pnpm --filter @creator-os/web dev
```
```bash
pnpm --filter @creator-os/worker dev
```
