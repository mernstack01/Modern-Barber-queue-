# Deploy

## Eng sodda Next.js fullstack variant

Yangi ixcham variant alohida papkada:

```bash
cd apps/next-fullstack
corepack pnpm install
corepack pnpm db:setup
corepack pnpm dev
```

Demo login:

```text
+998901234567
password123
```

Vercelga qo'yish uchun `apps/next-fullstack` papkani project root qilib tanlang.

Build command:

```bash
corepack pnpm build
```

Environment variables:

```env
DATABASE_URL=file:./dev.db
AUTH_SECRET=very-long-random-secret
```

Muhim: Vercelda loyiha ichidagi SQLite fayl database doimiy saqlanmaydi. Demo yoki test uchun yetadi, lekin haqiqiy mijoz ma'lumotlari uchun Vercel Postgres, Neon yoki Supabase Postgres URL ishlatish kerak bo'ladi. Bunday holatda schema providerini `postgresql`ga qaytarib migrate qilish kerak.

---

Bu loyiha uchun eng sodda production yo'l: VPS + Docker Compose.

## 1. Server tayyorlash

Serverda Docker va Docker Compose o'rnatilgan bo'lishi kerak.

```bash
git clone <repo-url>
cd barbers-mnge
cp .env.prod.example .env.prod
```

`.env.prod` ichidagi qiymatlarni almashtiring:

```env
POSTGRES_PASSWORD=strong-password
JWT_SECRET=very-long-random-secret
WEB_ORIGIN=http://SERVER_IP:3000
NEXT_PUBLIC_API_URL=http://SERVER_IP:4000
```

Domain ishlatsangiz:

```env
WEB_ORIGIN=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

## 2. Build va start

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d
```

## 3. Database migrate va seed

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec api npx prisma migrate deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml exec api npm run db:seed
```

Demo login:

```text
+998901234567
password123
```

## 4. Ochish

```text
Web: http://SERVER_IP:3000
API: http://SERVER_IP:4000
Swagger: http://SERVER_IP:4000/docs
```

API endpointlarni browserda to'g'ridan-to'g'ri ochmang. Masalan `/queue` tokensiz ochilsa `401 Unauthorized` qaytarishi normal. Foydalanish uchun web appga login qiling.
