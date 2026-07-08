# Barber Queue Management SaaS

Production-ready MVP for a multi-tenant barber queue management SaaS. Barbers add walk-in customers to a queue, manually call them when ready, and track service history. The app does not send SMS, Telegram, WhatsApp, or push notifications.

## Stack

- Monorepo: pnpm workspaces
- Web: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn-style components, React Hook Form, Zod, TanStack Query, Zustand, Framer Motion, Lucide Icons
- API: NestJS, Prisma ORM, PostgreSQL, JWT access tokens, refresh tokens, bcrypt, Swagger
- Production: Helmet, CORS, compression, validation pipe, global exception filter, rate limiting, Docker, Docker Compose

## Features

- Multi-tenant barber shops with owner/barber roles
- Protected routes and tenant-scoped API queries
- Dashboard metrics, cancelled customers, revenue placeholder, queue and weekly charts
- Queue CRUD, call/start/finish/cancel/delete, drag-and-drop ordering, search, filters, pagination-ready response shape
- Customers CRUD with notes and visit history
- Daily/weekly/monthly history-ready API with search/filter
- Barber profile and shop settings
- Dark/light mode, responsive sidebar/top navigation, breadcrumbs, command palette with `Ctrl + K`, skeletons, toasts, animated page transitions

## Setup

```bash
corepack enable
corepack pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Update `apps/api/.env` with your `DATABASE_URL` and a long `JWT_SECRET`.

```bash
corepack pnpm prisma:migrate
corepack pnpm db:seed
corepack pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Swagger: http://localhost:4000/docs

## Demo Login

- Phone: `+998901234567`
- Password: `password123`

## Docker

```bash
docker compose up --build
```

Then run migrations/seeding against the API database from your host or a one-off API container:

```bash
corepack pnpm prisma:migrate
corepack pnpm db:seed
```

## API Routes

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /dashboard`
- `GET /queue`
- `GET /queue/:id`
- `POST /queue`
- `PATCH /queue/:id`
- `DELETE /queue/:id`
- `POST /queue/:id/call`
- `POST /queue/:id/start`
- `POST /queue/:id/finish`
- `GET /customers`
- `GET /customers/:id`
- `POST /customers`
- `PATCH /customers/:id`
- `DELETE /customers/:id`
- `GET /history`
- `GET /profile`
- `PATCH /profile`
- `GET /settings`
- `PATCH /settings`

## Quality Gates

```bash
corepack pnpm prisma:generate
corepack pnpm lint
corepack pnpm build
```
# Modern-Barber-queue-
# Modern-Barber-queue-
