import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const services = ["Classic Cut", "Skin Fade", "Beard Trim", "Fade + Beard", "Kids Cut", "Buzz Cut", "Executive Cut"];
const firstNames = ["Jasur", "Otabek", "Sardor", "Bekzod", "Timur", "Akmal", "Aziz", "Diyor", "Farrukh", "Kamron"];
const lastNames = ["Rahimov", "Saidov", "Aliyev", "Umarov", "Nabiyev", "Yusupov", "Karimov", "Tursunov", "Murodov", "Ismoilov"];

async function main() {
  await setupSchema();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.barberShop.deleteMany();

  const shop = await prisma.barberShop.create({
    data: {
      name: "Atlas Barber Studio",
      phone: "+998901234567",
      address: "Amir Temur Avenue 24, Tashkent",
      logo: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=400&auto=format&fit=crop",
      workingHours: "09:00 - 20:00",
      queueSettings: JSON.stringify({ defaultEstimatedWait: 20, autoPosition: true, maxDailyQueue: 80 })
    }
  });

  const password = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      shopId: shop.id,
      name: "Aziz Karimov",
      phone: "+998901234567",
      password,
      role: "OWNER",
      profile: { create: { avatar: shop.logo, workingHours: "09:00 - 20:00", bio: "Owner barber with 10 years of experience." } }
    }
  });

  await prisma.user.create({
    data: {
      shopId: shop.id,
      name: "Dilshod Nazarov",
      phone: "+998901234568",
      password,
      role: "BARBER",
      profile: { create: { workingHours: "11:00 - 19:00", bio: "Fade and beard specialist." } }
    }
  });

  for (let index = 0; index < 50; index += 1) {
    const active = index < 10;
    const status = active ? (index === 0 ? "IN_SERVICE" : index === 1 ? "CALLING" : "WAITING") : index % 9 === 0 ? "CANCELLED" : "COMPLETED";
    const createdAt = active ? minutesAgo(10 + index * 8) : daysAgo(index % 21);
    const startedAt = status === "IN_SERVICE" || status === "COMPLETED" ? addMinutes(createdAt, 25 + (index % 4) * 5) : null;
    const finishedAt = status === "COMPLETED" || status === "CANCELLED" ? addMinutes(startedAt ?? createdAt, status === "CANCELLED" ? 8 : 35) : null;

    await prisma.customer.create({
      data: {
        shopId: shop.id,
        name: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`,
        phone: `+99890${String(1110000 + index).padStart(7, "0")}`,
        notes: index % 4 === 0 ? "Prefers a clean neckline and low product finish." : null,
        createdAt,
        queues: {
          create: {
            shopId: shop.id,
            service: services[index % services.length],
            estimatedWait: 15 + (index % 6) * 5,
            position: active ? index + 1 : 100 + index,
            status,
            calledAt: status === "CALLING" ? new Date() : null,
            startedAt,
            finishedAt,
            createdAt
          }
        }
      }
    });
  }
}

async function setupSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "BarberShop" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "address" TEXT NOT NULL, "logo" TEXT, "workingHours" TEXT NOT NULL DEFAULT '09:00 - 20:00', "queueSettings" TEXT NOT NULL DEFAULT '{"defaultEstimatedWait":20,"autoPosition":true}', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, "deletedAt" DATETIME)`,
    `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "password" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'BARBER', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, "deletedAt" DATETIME, CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "BarberShop" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "Customer" ("id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "notes" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, "deletedAt" DATETIME, CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "BarberShop" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "Queue" ("id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "service" TEXT NOT NULL, "estimatedWait" INTEGER NOT NULL, "position" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'WAITING', "calledAt" DATETIME, "startedAt" DATETIME, "finishedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, "deletedAt" DATETIME, CONSTRAINT "Queue_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "BarberShop" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "Queue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "Profile" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "avatar" TEXT, "workingHours" TEXT NOT NULL DEFAULT '09:00 - 20:00', "bio" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "RefreshToken" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL, "revokedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "AuditLog" ("id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL, "userId" TEXT, "action" TEXT NOT NULL, "entity" TEXT NOT NULL, "entityId" TEXT, "metadata" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "BarberShop" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone")`,
    `CREATE INDEX IF NOT EXISTS "User_shopId_idx" ON "User"("shopId")`,
    `CREATE INDEX IF NOT EXISTS "Customer_shopId_idx" ON "Customer"("shopId")`,
    `CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone")`,
    `CREATE INDEX IF NOT EXISTS "Queue_shopId_status_position_idx" ON "Queue"("shopId", "status", "position")`,
    `CREATE INDEX IF NOT EXISTS "Queue_createdAt_idx" ON "Queue"("createdAt")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId")`,
    `CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId")`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_shopId_createdAt_idx" ON "AuditLog"("shopId", "createdAt")`
  ];

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10 + (days % 8), 15, 0, 0);
  return date;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
