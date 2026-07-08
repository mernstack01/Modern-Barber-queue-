import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(shopId: string) {
    const shop = await this.prisma.barberShop.findFirst({ where: { id: shopId, deletedAt: null } });
    if (!shop) throw new NotFoundException("Shop settings not found");
    return {
      shopInformation: shop,
      workingHours: shop.workingHours,
      queueSettings: shop.queueSettings,
      theme: "system",
      language: "en",
      supportedLanguages: ["en", "uz", "ru"]
    };
  }

  async updateSettings(shopId: string, userId: string, dto: UpdateSettingsDto) {
    const shop = await this.prisma.barberShop.update({
      where: { id: shopId },
      data: {
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        logo: dto.logo,
        workingHours: dto.workingHours,
        queueSettings: dto.queueSettings as Prisma.InputJsonValue | undefined
      }
    });
    await this.prisma.auditLog.create({ data: { shopId, userId, action: "SETTINGS_UPDATED", entity: "BarberShop", entityId: shop.id } });
    return this.getSettings(shop.id);
  }
}
