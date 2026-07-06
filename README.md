# FlagBase

A self-hosted feature flag and experimentation platform. Manage flags, gradual rollouts, targeting rules, and audience segments across multiple environments, with a Node.js SDK for evaluating flags in your own services.

## Features

- **Flags** — boolean, string, number, and JSON flags with per-environment state
- **Gradual rollouts** — percentage-based rollout dial per flag
- **Targeting rules** — ordered rule sets with conditions (equality, contains, prefix, list membership, semver, percentile) evaluated against a user context
- **Segments** — reusable audience definitions shared across flags
- **Environments** — isolated flag state (e.g. development, staging, production) with scoped SDK tokens
- **Audit log** — history of who changed what, and when
- **Stale flag detection** — surfaces flags that haven't been touched in 90+ days

## Stack

| Layer  | Tech |
| ------ | ---- |
| Server | Fastify, Drizzle ORM, PostgreSQL, Zod, JWT auth |
| Web    | React, Vite, TanStack Query, Tailwind CSS, React Router |
| SDK    | `@flagbase/sdk-node` — polling client for server-side flag evaluation |

## Project structure

```
apps/
  server/     Fastify API + Postgres (Drizzle)
  web/        React dashboard
  sdk-node/   Node.js SDK for evaluating flags
```

## Getting started

```bash
pnpm install
cp .env.example apps/server/.env   # adjust as needed
docker compose up -d               # Postgres + pgAdmin
pnpm db:push                       # apply schema
pnpm dev:server                    # API on :3001
pnpm dev:web                       # dashboard on :5173
```

## Scripts

- `pnpm dev:server` — run the API in watch mode
- `pnpm dev:web` — run the web dashboard
- `pnpm build` — build all packages
- `pnpm db:push` / `pnpm db:studio` — Drizzle schema push / studio

## SDK usage

```ts
import { FlagBase } from '@flagbase/sdk-node'

const client = new FlagBase({
  baseUrl: 'https://your-flagbase-instance.com',
  sdkToken: process.env.FLAGBASE_SDK_TOKEN!,
})

const enabled = await client.isEnabled('new-checkout-flow', { userId: 'user_123' })
```
