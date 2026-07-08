import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(shopId: string, search?: string) {
    const where: Prisma.CustomerWhereInput = { shopId, deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } }
      ];
    }
    return this.prisma.customer.findMany({
      where,
      include: { queues: { orderBy: { createdAt: "desc" }, take: 5 } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async findOne(shopId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, shopId, deletedAt: null },
      include: { queues: { orderBy: { createdAt: "desc" } } }
    });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async create(shopId: string, userId: string, dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({ data: { shopId, ...dto } });
    await this.audit(shopId, userId, "CUSTOMER_CREATED", customer.id);
    return customer;
  }

  async update(shopId: string, userId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(shopId, id);
    const customer = await this.prisma.customer.update({ where: { id }, data: dto });
    await this.audit(shopId, userId, "CUSTOMER_UPDATED", customer.id);
    return customer;
  }

  async delete(shopId: string, userId: string, id: string) {
    await this.findOne(shopId, id);
    const customer = await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit(shopId, userId, "CUSTOMER_DELETED", customer.id);
    return customer;
  }

  private async audit(shopId: string, userId: string, action: string, entityId: string) {
    await this.prisma.auditLog.create({ data: { shopId, userId, action, entity: "Customer", entityId } });
  }
}
