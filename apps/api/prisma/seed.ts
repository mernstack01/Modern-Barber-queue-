import { PrismaClient, QueueStatus, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const services = ["Classic Cut", "Skin Fade", "Beard Trim", "Fade + Beard", "Kids Cut", "Buzz Cut", "Executive Cut"];
const firstNames = ["Jasur", "Otabek", "Sardor", "Bekzod", "Timur", "Akmal", "Aziz", "Diyor", "Farrukh", "Kamron"];
const lastNames = ["Rahimov", "Saidov", "Aliyev", "Umarov", "Nabiyev", "Yusupov", "Karimov", "Tursunov", "Murodov", "Ismoilov"];

async function main() {
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
      queueSettings: { defaultEstimatedWait: 20, autoPosition: true, maxDailyQueue: 80 }
    }
  });

  const password = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      shopId: shop.id,
      name: "Aziz Karimov",
      phone: "+998901234567",
      password,
      role: Role.OWNER,
      profile: { create: { avatar: shop.logo, workingHours: "09:00 - 20:00", bio: "Owner barber with 10 years of experience." } }
    }
  });

  await prisma.user.create({
    data: {
      shopId: shop.id,
      name: "Dilshod Nazarov",
      phone: "+998901234568",
      password,
      role: Role.BARBER,
      profile: { create: { workingHours: "11:00 - 19:00", bio: "Fade and beard specialist." } }
    }
  });

  for (let index = 0; index < 50; index += 1) {
    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        name: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`,
        phone: `+99890${String(1110000 + index).padStart(7, "0")}`,
        notes: index % 4 === 0 ? "Prefers a clean neckline and low product finish." : null,
        createdAt: daysAgo(index % 24)
      }
    });

    const active = index < 10;
    const status = active
      ? index === 0
        ? QueueStatus.IN_SERVICE
        : index === 1
          ? QueueStatus.CALLING
          : QueueStatus.WAITING
      : index % 9 === 0
        ? QueueStatus.CANCELLED
        : QueueStatus.COMPLETED;
    const createdAt = active ? minutesAgo(10 + index * 8) : daysAgo(index % 21);
    const startedAt = status === QueueStatus.IN_SERVICE || status === QueueStatus.COMPLETED ? addMinutes(createdAt, 25 + (index % 4) * 5) : null;
    const finishedAt = status === QueueStatus.COMPLETED || status === QueueStatus.CANCELLED ? addMinutes(startedAt ?? createdAt, status === QueueStatus.CANCELLED ? 8 : 35) : null;

    await prisma.queue.create({
      data: {
        shopId: shop.id,
        customerId: customer.id,
        service: services[index % services.length],
        estimatedWait: 15 + (index % 6) * 5,
        position: active ? index + 1 : 100 + index,
        status,
        calledAt: status === QueueStatus.CALLING ? new Date() : null,
        startedAt,
        finishedAt,
        createdAt
      }
    });
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
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
