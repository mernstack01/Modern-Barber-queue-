import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/server/db";
import { makeRefreshToken, signAccessToken, verifyAccessToken, type AuthUser } from "@/lib/server/auth";

type QueueStatus = "WAITING" | "CALLING" | "IN_SERVICE" | "COMPLETED" | "CANCELLED";
type RouteContext = { params: Promise<{ path?: string[] }> };

const activeStatuses: QueueStatus[] = ["WAITING", "CALLING", "IN_SERVICE"];

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

async function handle(request: NextRequest, context: RouteContext) {
  try {
    const { path = [] } = await context.params;
    const [resource, id, action] = path;
    const method = request.method;

    if (resource === "auth" && id === "login" && method === "POST") return json(await login(await readBody(request)));
    if (resource === "auth" && id === "refresh" && method === "POST") return json(await refresh(await readBody(request)));

    const user = requireUser(request);

    if (resource === "auth" && id === "logout" && method === "POST") return json(await logout(user));
    if (resource === "dashboard" && method === "GET") return json(await dashboard(user.shopId));
    if (resource === "queue") return json(await queue(request, user, id, action));
    if (resource === "history" && method === "GET") return json(await history(request, user.shopId));
    if (resource === "customers") return json(await customers(request, user, id));
    if (resource === "profile") return json(await profile(request, user));
    if (resource === "settings") return json(await settings(request, user));

    throw new HttpError(404, "API route not found");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ message }, { status });
  }
}

async function login(input: { phone?: string; password?: string }) {
  const user = await prisma.user.findUnique({
    where: { phone: input.phone ?? "" },
    include: { shop: true, profile: true }
  });
  if (!user || !(await bcrypt.compare(input.password ?? "", user.password))) {
    throw new HttpError(401, "Invalid phone or password");
  }

  const refreshToken = makeRefreshToken();
  const stored = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await bcrypt.hash(refreshToken, 10),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });

  return {
    accessToken: signAccessToken(user, stored.id),
    refreshToken,
    user: toProfile(user)
  };
}

async function refresh(input: { refreshToken?: string }) {
  if (!input.refreshToken) throw new HttpError(401, "Invalid refresh token");
  const tokens = await prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true }
  });
  for (const token of tokens) {
    if (await bcrypt.compare(input.refreshToken, token.tokenHash)) {
      return { accessToken: signAccessToken(token.user, token.id) };
    }
  }
  throw new HttpError(401, "Invalid refresh token");
}

async function logout(user: AuthUser) {
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, ...(user.tokenId ? { id: user.tokenId } : {}), revokedAt: null },
    data: { revokedAt: new Date() }
  });
  return { success: true };
}

async function dashboard(shopId: string) {
  const today = dayRange(new Date());
  const [todayCustomers, waitingCustomers, completedCustomers, cancelledCustomers, currentCustomer, finishedToday, grouped] = await Promise.all([
    prisma.queue.count({ where: { shopId, deletedAt: null, createdAt: today } }),
    prisma.queue.count({ where: { shopId, deletedAt: null, createdAt: today, status: { in: ["WAITING", "CALLING"] } } }),
    prisma.queue.count({ where: { shopId, createdAt: today, status: "COMPLETED" } }),
    prisma.queue.count({ where: { shopId, createdAt: today, status: "CANCELLED" } }),
    prisma.queue.findFirst({ where: { shopId, deletedAt: null, status: "IN_SERVICE" }, include: { customer: true }, orderBy: { startedAt: "desc" } }),
    prisma.queue.findMany({ where: { shopId, createdAt: today, status: "COMPLETED", startedAt: { not: null } }, select: { createdAt: true, startedAt: true } }),
    prisma.queue.groupBy({ by: ["status"], where: { shopId, createdAt: today }, _count: { status: true } })
  ]);

  const totalWait = finishedToday.reduce((sum, item) => sum + (item.startedAt ? Math.max(0, item.startedAt.getTime() - item.createdAt.getTime()) : 0), 0);

  return {
    todayCustomers,
    waitingCustomers,
    completedCustomers,
    cancelledCustomers,
    revenuePlaceholder: 0,
    averageWaitingTime: finishedToday.length > 0 ? Math.round(totalWait / finishedToday.length / 60000) : 0,
    currentCustomer,
    todayQueue: grouped.map((item) => ({ status: item.status, count: item._count.status })),
    weeklyCustomers: await weeklyCustomers(shopId)
  };
}

async function queue(request: NextRequest, user: AuthUser, id?: string, action?: string) {
  if (request.method === "GET" && !id) {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25)));
    const where: Record<string, unknown> = { shopId: user.shopId, deletedAt: null, customer: { deletedAt: null } };
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    if (search) where.OR = [{ customer: { name: { contains: search } } }, { customer: { phone: { contains: search } } }, { service: { contains: search } }];
    if (status && status !== "ALL") where.status = status;
    if (searchParams.get("today") === "true") where.createdAt = dayRange(new Date());

    const [items, total] = await Promise.all([
      prisma.queue.findMany({ where, include: { customer: true }, orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }], skip: (page - 1) * limit, take: limit }),
      prisma.queue.count({ where })
    ]);
    return { items, meta: { page, limit, total, pageCount: Math.ceil(total / limit) } };
  }

  if (request.method === "POST" && !id) {
    const input = await readBody(request);
    const position = await nextPosition(user.shopId);
    const created = await prisma.queue.create({
      data: {
        shop: { connect: { id: user.shopId } },
        customer: { create: { shopId: user.shopId, name: input.name, phone: input.phone, notes: input.notes } },
        service: input.service,
        estimatedWait: Number(input.estimatedWait ?? 20),
        position
      },
      include: { customer: true }
    });
    await audit(user, "QUEUE_CREATED", "Queue", created.id);
    return created;
  }

  if (request.method === "POST" && id === "reorder") {
    const input = await readBody(request);
    await prisma.$transaction((input.orderedIds ?? []).map((queueId: string, index: number) => prisma.queue.update({ where: { id: queueId }, data: { position: index + 1 } })));
    return queue(new NextRequest(new URL("/api/queue?today=true", request.url)), user);
  }

  if (!id) throw new HttpError(404, "Queue entry not found");

  if (request.method === "PATCH") {
    const existing = await findQueue(user.shopId, id);
    const input = await readBody(request);
    const updated = await prisma.queue.update({
      where: { id },
      data: {
        service: input.service,
        estimatedWait: input.estimatedWait === undefined ? undefined : Number(input.estimatedWait),
        status: input.status,
        position: input.position,
        customer: { update: { name: input.name ?? existing.customer.name, phone: input.phone ?? existing.customer.phone, notes: input.notes ?? existing.customer.notes } }
      },
      include: { customer: true }
    });
    await audit(user, "QUEUE_UPDATED", "Queue", updated.id);
    return updated;
  }

  if (request.method === "DELETE") {
    await findQueue(user.shopId, id);
    const deleted = await prisma.queue.update({ where: { id }, data: { status: "CANCELLED", finishedAt: new Date(), deletedAt: new Date() }, include: { customer: true } });
    await audit(user, "QUEUE_DELETED", "Queue", deleted.id);
    return deleted;
  }

  if (request.method === "POST" && action) {
    if (action === "call") return changeQueueStatus(user, id, ["WAITING", "CALLING"], { status: "CALLING", calledAt: new Date() }, "QUEUE_CALLED");
    if (action === "start") {
      await prisma.queue.updateMany({ where: { shopId: user.shopId, status: "IN_SERVICE", id: { not: id } }, data: { status: "WAITING", startedAt: null } });
      return changeQueueStatus(user, id, ["WAITING", "CALLING"], { status: "IN_SERVICE", startedAt: new Date() }, "QUEUE_STARTED");
    }
    if (action === "finish") return changeQueueStatus(user, id, ["IN_SERVICE", "CALLING"], { status: "COMPLETED", finishedAt: new Date() }, "QUEUE_FINISHED");
  }

  throw new HttpError(404, "Queue route not found");
}

async function customers(request: NextRequest, user: AuthUser, id?: string) {
  if (request.method === "GET") {
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const where: Record<string, unknown> = { shopId: user.shopId, deletedAt: null };
    if (search) where.OR = [{ name: { contains: search } }, { phone: { contains: search } }];
    return prisma.customer.findMany({ where, include: { queues: { orderBy: { createdAt: "desc" }, take: 5, include: { customer: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  const input = await readBody(request);
  if (request.method === "POST") {
    const created = await prisma.customer.create({ data: { shopId: user.shopId, name: input.name, phone: input.phone, notes: input.notes } });
    await audit(user, "CUSTOMER_CREATED", "Customer", created.id);
    return created;
  }
  if (!id) throw new HttpError(404, "Customer not found");
  await findCustomer(user.shopId, id);
  if (request.method === "PATCH") {
    const updated = await prisma.customer.update({ where: { id }, data: { name: input.name, phone: input.phone, notes: input.notes } });
    await audit(user, "CUSTOMER_UPDATED", "Customer", updated.id);
    return updated;
  }
  if (request.method === "DELETE") {
    const deleted = await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(user, "CUSTOMER_DELETED", "Customer", deleted.id);
    return deleted;
  }
  throw new HttpError(405, "Method not allowed");
}

async function history(request: NextRequest, shopId: string) {
  const selected = request.nextUrl.searchParams.get("date") ? new Date(request.nextUrl.searchParams.get("date") as string) : new Date();
  const where: Record<string, unknown> = { shopId, createdAt: dayRange(selected) };
  const items = await prisma.queue.findMany({ where, include: { customer: true }, orderBy: { createdAt: "desc" } });
  return items.map((item) => ({
    ...item,
    waitingTime: item.startedAt ? Math.max(0, Math.round((item.startedAt.getTime() - item.createdAt.getTime()) / 60000)) : null,
    serviceDuration: item.startedAt && item.finishedAt ? Math.max(0, Math.round((item.finishedAt.getTime() - item.startedAt.getTime()) / 60000)) : null
  }));
}

async function profile(request: NextRequest, user: AuthUser) {
  if (request.method === "GET") return getProfile(user.shopId, user.id);
  if (request.method === "PATCH") {
    const input = await readBody(request);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        phone: input.phone,
        shop: input.shopName || input.address ? { update: { name: input.shopName, address: input.address } } : undefined,
        profile: { upsert: { create: { avatar: input.avatar, workingHours: input.workingHours ?? "09:00 - 20:00" }, update: { avatar: input.avatar, workingHours: input.workingHours } } }
      }
    });
    return getProfile(user.shopId, updated.id);
  }
  throw new HttpError(405, "Method not allowed");
}

async function settings(request: NextRequest, user: AuthUser) {
  if (request.method === "GET") return getSettings(user.shopId);
  if (request.method === "PATCH") {
    const input = await readBody(request);
    await prisma.barberShop.update({
      where: { id: user.shopId },
      data: {
        name: input.name,
        phone: input.phone,
        address: input.address,
        logo: input.logo,
        workingHours: input.workingHours,
        queueSettings: input.queueSettings ? JSON.stringify(input.queueSettings) : undefined
      }
    });
    await audit(user, "SETTINGS_UPDATED", "BarberShop", user.shopId);
    return getSettings(user.shopId);
  }
  throw new HttpError(405, "Method not allowed");
}

async function changeQueueStatus(user: AuthUser, id: string, allowed: QueueStatus[], data: Record<string, unknown>, action: string) {
  const existing = await findQueue(user.shopId, id);
  if (!allowed.includes(existing.status as QueueStatus)) throw new HttpError(400, `Cannot change a ${existing.status.toLowerCase()} queue item this way`);
  const updated = await prisma.queue.update({ where: { id }, data, include: { customer: true } });
  await audit(user, action, "Queue", updated.id);
  return updated;
}

async function findQueue(shopId: string, id: string) {
  const queueItem = await prisma.queue.findFirst({ where: { id, shopId, deletedAt: null }, include: { customer: true } });
  if (!queueItem) throw new HttpError(404, "Queue entry not found");
  return queueItem;
}

async function findCustomer(shopId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, shopId, deletedAt: null } });
  if (!customer) throw new HttpError(404, "Customer not found");
  return customer;
}

async function nextPosition(shopId: string) {
  const aggregate = await prisma.queue.aggregate({ where: { shopId, deletedAt: null, status: { in: activeStatuses } }, _max: { position: true } });
  return (aggregate._max.position ?? 0) + 1;
}

async function getProfile(shopId: string, id: string) {
  const user = await prisma.user.findUnique({ where: { id }, include: { shop: true, profile: true } });
  if (!user || user.shopId !== shopId) throw new HttpError(404, "Profile not found");
  return toProfile(user);
}

async function getSettings(shopId: string) {
  const shop = await prisma.barberShop.findFirst({ where: { id: shopId, deletedAt: null } });
  if (!shop) throw new HttpError(404, "Shop settings not found");
  const queueSettings = parseJson(shop.queueSettings);
  return {
    shopInformation: { ...shop, queueSettings },
    workingHours: shop.workingHours,
    queueSettings,
    theme: "system",
    language: "uz",
    supportedLanguages: ["uz", "ru", "en"]
  };
}

async function weeklyCustomers(shopId: string) {
  return Promise.all(
    Array.from({ length: 7 }).map(async (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return { day: date.toISOString().slice(0, 10), count: await prisma.queue.count({ where: { shopId, createdAt: dayRange(date) } }) };
    })
  );
}

async function audit(user: AuthUser, action: string, entity: string, entityId?: string) {
  await prisma.auditLog.create({ data: { shopId: user.shopId, userId: user.id, action, entity, entityId } });
}

function requireUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? verifyAccessToken(token) : null;
  if (!user) throw new HttpError(401, "Unauthorized");
  return user;
}

function toProfile(user: { id: string; name: string; phone: string; role: string; shopId: string; createdAt: Date; shop: { id: string; name: string; address: string; workingHours: string; logo: string | null }; profile: { avatar: string | null; workingHours: string } | null }) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    shopId: user.shopId,
    shopName: user.shop.name,
    address: user.shop.address,
    workingHours: user.profile?.workingHours ?? user.shop.workingHours,
    avatar: user.profile?.avatar ?? user.shop.logo,
    createdAt: user.createdAt
  };
}

async function readBody(request: NextRequest) {
  return request.json().catch(() => ({}));
}

function dayRange(date: Date) {
  return { gte: startOfDay(date), lte: endOfDay(date) };
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
