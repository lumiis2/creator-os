# Local requirements

## System
- Node.js 20+
- pnpm 8.15.6
- Docker (for local Postgres/Redis) or managed services (Neon/Upstash)

## Services (choose one in each category)

### Database
- Neon Postgres (recommended) OR local Postgres 16

### Redis
- Upstash Redis REST (required for web cache + token budget)
- Local Redis TCP (required for BullMQ queue)

### AI provider
- Anthropic (default)
- Groq (alternative)

## Quick run (local)
1) Configure env source of truth
- cp .env.example .env
- cp .env apps/web/.env.local
- cp .env apps/worker/.env

2) Install dependencies
- corepack enable
- corepack prepare pnpm@8.15.6 --activate
- pnpm install

3) Start services (if local)
- docker run --name creatoros-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=creatoros -p 5432:5432 -d postgres:16
- docker run --name creatoros-redis -p 6379:6379 -d redis:7

4) Run migrations
- pnpm --filter @creator-os/db exec drizzle-kit push

5) Run apps
- pnpm --filter @creator-os/web dev
- pnpm --filter @creator-os/worker dev
