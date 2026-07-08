# Free Deploy

Eng qulay bepul kombinatsiya:

- Database: Neon Free Postgres
- API: Render Free Web Service
- Web: Vercel Hobby

Vercel Hobby `$0/mo` plan beradi va Next.js uchun juda qulay. Neon Free Postgres `$0`, vaqt limitsiz va kredit karta talab qilmaydigan free plan sifatida ko'rsatilgan. Render’da API uchun free web service ishlatish mumkin, lekin u bo'sh turganda uxlab qolishi mumkin.

## 1. Neon database

1. https://neon.com saytida account oching.
2. New Project yarating.
3. Connection string oling.
4. U shunaqa ko'rinishda bo'ladi:

```text
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Bu `DATABASE_URL` bo'ladi.

## 2. API deploy: Render

1. https://render.com saytida account oching.
2. New -> Web Service.
3. GitHub repo ulang.
4. Runtime sifatida Docker tanlang.
5. Dockerfile path:

```text
apps/api/Dockerfile
```

6. Environment variables:

```env
DATABASE_URL=NEON_CONNECTION_STRING
JWT_SECRET=long-random-secret-at-least-32-characters
JWT_EXPIRES_IN=15m
WEB_ORIGIN=https://YOUR_VERCEL_APP.vercel.app
PORT=4000
```

7. Deploy qiling.

API URL shunaqa bo'ladi:

```text
https://your-api-name.onrender.com
```

API start bo'lganda migration avtomatik ishlaydi.

Demo data kerak bo'lsa Render Shell yoki local terminaldan bir marta seed qiling:

```bash
DATABASE_URL="NEON_CONNECTION_STRING" corepack pnpm --filter @barbers/api db:seed
```

Diqqat: hozirgi seed demo ma'lumotlarni qayta yaratadi, productionda ko'p marta ishlatmang.

## 3. Web deploy: Vercel

1. https://vercel.com saytida account oching.
2. Add New -> Project.
3. GitHub repo ulang.
4. Root Directory:

```text
apps/web
```

5. Environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-api-name.onrender.com
```

6. Deploy qiling.

Web URL:

```text
https://your-web-name.vercel.app
```

## 4. Render `WEB_ORIGIN`ni yangilash

Vercel URL tayyor bo'lgach Render API service settingsga qayting:

```env
WEB_ORIGIN=https://your-web-name.vercel.app
```

Keyin API service redeploy qiling.

## 5. Login

Seed ishlatilgan bo'lsa:

```text
+998901234567
password123
```

API URLni browserda to'g'ridan-to'g'ri ochib `/queue`ga kirsangiz `401 Unauthorized` chiqishi normal. Web app orqali login qiling.
