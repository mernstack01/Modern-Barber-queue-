import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, QueueStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";
import { CreateQueueDto } from "./dto/create-queue.dto";
import { UpdateQueueDto } from "./dto/update-queue.dto";

const queueInclude = { customer: true } satisfies Prisma.QueueInclude;

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(shopId: string, params: { search?: string; status?: string; today?: boolean; page?: number; limit?: number }) {
    const where: Prisma.QueueWhereInput = { shopId, deletedAt: null, customer: { deletedAt: null } };
    const search = params.search?.trim();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));

    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
        { service: { contains: search, mode: "insensitive" } }
      ];
    }

    if (params.status && params.status !== "ALL") {
      where.status = params.status as QueueStatus;
    }

    if (params.today) {
      const now = new Date();
      where.createdAt = { gte: startOfDay(now), lte: endOfDay(now) };
    }

    const [items, total] = await Promise.all([
      this.prisma.queue.findMany({
        where,
        include: queueInclude,
        orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.queue.count({ where })
    ]);
    return { items, meta: { page, limit, total, pageCount: Math.ceil(total / limit) } };
  }

  async create(shopId: string, userId: string, dto: CreateQueueDto) {
    const position = await this.nextPosition(shopId);
    return this.prisma.queue.create({
      data: {
        shop: { connect: { id: shopId } },
        customer: {
          create: {
            shopId,
            name: dto.name,
            phone: dto.phone,
            notes: dto.notes
          }
        },
        service: dto.service,
        estimatedWait: dto.estimatedWait,
        position
      },
      include: queueInclude
    }).then((queue) => this.audit(shopId, userId, "QUEUE_CREATED", "Queue", queue.id).then(() => queue));
  }

  async update(shopId: string, userId: string, id: string, dto: UpdateQueueDto) {
    const existing = await this.findOne(shopId, id);
    return this.prisma.queue.update({
      where: { id },
      data: {
        service: dto.service,
        estimatedWait: dto.estimatedWait,
        status: dto.status,
        position: dto.position,
        customer: {
          update: {
            name: dto.name ?? existing.customer.name,
            phone: dto.phone ?? existing.customer.phone,
            notes: dto.notes ?? existing.customer.notes
          }
        }
      },
      include: queueInclude
    }).then((queue) => this.audit(shopId, userId, "QUEUE_UPDATED", "Queue", queue.id).then(() => queue));
  }

  async reorder(shopId: string, orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.queue.update({
          where: { id },
          data: { position: index + 1 }
        })
      )
    );
    return this.findAll(shopId, { today: true, limit: 100 });
  }

  async call(shopId: string, userId: string, id: string) {
    await this.assertTransition(shopId, id, [QueueStatus.WAITING, QueueStatus.CALLING]);
    return this.prisma.queue.update({
      where: { id },
      data: { status: QueueStatus.CALLING, calledAt: new Date() },
      include: queueInclude
    }).then((queue) => this.audit(shopId, userId, "QUEUE_CALLED", "Queue", queue.id).then(() => queue));
  }

  async start(shopId: string, userId: string, id: string) {
    await this.assertTransition(shopId, id, [QueueStatus.WAITING, QueueStatus.CALLING]);
    await this.prisma.queue.updateMany({
      where: { shopId, status: QueueStatus.IN_SERVICE, id: { not: id } },
      data: { status: QueueStatus.WAITING, startedAt: null }
    });

    return this.prisma.queue.update({
      where: { id },
      data: { status: QueueStatus.IN_SERVICE, startedAt: new Date() },
      include: queueInclude
    }).then((queue) => this.audit(shopId, userId, "QUEUE_STARTED", "Queue", queue.id).then(() => queue));
  }

  async finish(shopId: string, userId: string, id: string) {
    await this.assertTransition(shopId, id, [QueueStatus.IN_SERVICE, QueueStatus.CALLING]);
    return this.prisma.queue.update({
      where: { id },
      data: { status: QueueStatus.COMPLETED, finishedAt: new Date() },
      include: queueInclude
    }).then((queue) => this.audit(shopId, userId, "QUEUE_FINISHED", "Queue", queue.id).then(() => queue));
  }

  async delete(shopId: string, userId: string, id: string) {
    await this.findOne(shopId, id);
    return this.prisma.queue.update({
      where: { id },
      data: { status: QueueStatus.CANCELLED, finishedAt: new Date(), deletedAt: new Date() },
      include: queueInclude
    }).then((queue) => this.audit(shopId, userId, "QUEUE_DELETED", "Queue", queue.id).then(() => queue));
  }

  async findOneForShop(shopId: string, id: string) {
    return this.findOne(shopId, id);
  }

  private async findOne(shopId: string, id: string) {
    const queue = await this.prisma.queue.findFirst({ where: { id, shopId, deletedAt: null }, include: queueInclude });
    if (!queue) throw new NotFoundException("Queue entry not found");
    return queue;
  }

  private async nextPosition(shopId: string) {
    const aggregate = await this.prisma.queue.aggregate({
      where: { shopId, deletedAt: null, status: { in: [QueueStatus.WAITING, QueueStatus.CALLING, QueueStatus.IN_SERVICE] } },
      _max: { position: true }
    });
    return (aggregate._max.position ?? 0) + 1;
  }

  private async assertTransition(shopId: string, id: string, allowed: QueueStatus[]) {
    const queue = await this.findOne(shopId, id);
    if (!allowed.includes(queue.status)) {
      throw new BadRequestException(`Cannot change a ${queue.status.toLowerCase()} queue item this way`);
    }
    return queue;
  }

  private async audit(shopId: string, userId: string, action: string, entity: string, entityId?: string) {
    await this.prisma.auditLog.create({ data: { shopId, userId, action, entity, entityId } });
  }
}
