import { Injectable } from "@nestjs/common";
import { QueueStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(shopId: string) {
    const now = new Date();
    const today = { gte: startOfDay(now), lte: endOfDay(now) };

    const [todayCustomers, waitingCustomers, completedCustomers, cancelledCustomers, currentCustomer, finishedToday] =
      await Promise.all([
        this.prisma.queue.count({ where: { shopId, deletedAt: null, createdAt: today } }),
        this.prisma.queue.count({ where: { shopId, deletedAt: null, createdAt: today, status: { in: [QueueStatus.WAITING, QueueStatus.CALLING] } } }),
        this.prisma.queue.count({ where: { shopId, createdAt: today, status: QueueStatus.COMPLETED } }),
        this.prisma.queue.count({ where: { shopId, createdAt: today, status: QueueStatus.CANCELLED } }),
        this.prisma.queue.findFirst({
          where: { shopId, deletedAt: null, status: QueueStatus.IN_SERVICE },
          include: { customer: true },
          orderBy: { startedAt: "desc" }
        }),
        this.prisma.queue.findMany({
          where: {
            createdAt: today,
            shopId,
            status: QueueStatus.COMPLETED,
            startedAt: { not: null }
          },
          select: { createdAt: true, startedAt: true }
        })
      ]);

    const totalWait = finishedToday.reduce((sum, item) => {
      if (!item.startedAt) return sum;
      return sum + Math.max(0, item.startedAt.getTime() - item.createdAt.getTime());
    }, 0);

    const averageWaitingTime =
      finishedToday.length > 0 ? Math.round(totalWait / finishedToday.length / 60000) : 0;

    return {
      todayCustomers,
      waitingCustomers,
      completedCustomers,
      cancelledCustomers,
      revenuePlaceholder: 0,
      currentCustomer,
      averageWaitingTime,
      todayQueue: await this.byStatus(shopId, today),
      weeklyCustomers: await this.weeklyCustomers(shopId)
    };
  }

  private async byStatus(shopId: string, today: { gte: Date; lte: Date }) {
    const grouped = await this.prisma.queue.groupBy({ by: ["status"], where: { shopId, createdAt: today }, _count: { status: true } });
    return grouped.map((item) => ({ status: item.status, count: item._count.status }));
  }

  private async weeklyCustomers(shopId: string) {
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    return Promise.all(
      days.map(async (day) => ({
        day: day.toISOString().slice(0, 10),
        count: await this.prisma.queue.count({ where: { shopId, createdAt: { gte: startOfDay(day), lte: endOfDay(day) } } })
      }))
    );
  }
}
