import { Injectable } from "@nestjs/common";
import { Prisma, QueueStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(shopId: string, params: { date?: string; range?: "daily" | "weekly" | "monthly"; search?: string; status?: string }) {
    const selected = params.date ? new Date(params.date) : new Date();
    const start = startOfDay(selected);
    const end = endOfDay(selected);
    if (params.range === "weekly") start.setDate(start.getDate() - 6);
    if (params.range === "monthly") start.setDate(start.getDate() - 29);
    const where: Prisma.QueueWhereInput = { shopId, createdAt: { gte: start, lte: end } };
    if (params.status && params.status !== "ALL") where.status = params.status as QueueStatus;
    if (params.search) {
      where.OR = [
        { customer: { name: { contains: params.search, mode: "insensitive" } } },
        { customer: { phone: { contains: params.search, mode: "insensitive" } } },
        { service: { contains: params.search, mode: "insensitive" } }
      ];
    }
    const items = await this.prisma.queue.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });

    return items.map((item) => ({
      ...item,
      waitingTime: item.startedAt ? Math.max(0, Math.round((item.startedAt.getTime() - item.createdAt.getTime()) / 60000)) : null,
      serviceDuration:
        item.startedAt && item.finishedAt
          ? Math.max(0, Math.round((item.finishedAt.getTime() - item.startedAt.getTime()) / 60000))
          : null
    }));
  }
}
