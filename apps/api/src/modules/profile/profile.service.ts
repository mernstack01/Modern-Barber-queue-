import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(shopId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, role: true, createdAt: true, profile: true, shop: true }
    });
    if (!user || user.shop.id !== shopId) throw new NotFoundException("Profile not found");
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      shopId: user.shop.id,
      shopName: user.shop.name,
      address: user.shop.address,
      workingHours: user.profile?.workingHours ?? user.shop.workingHours,
      avatar: user.profile?.avatar ?? user.shop.logo,
      createdAt: user.createdAt
    };
  }

  async updateProfile(shopId: string, id: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        shop: dto.shopName || dto.address ? { update: { name: dto.shopName, address: dto.address } } : undefined,
        profile: {
          upsert: {
            create: { avatar: dto.avatar, workingHours: dto.workingHours ?? "09:00 - 20:00" },
            update: { avatar: dto.avatar, workingHours: dto.workingHours }
          }
        }
      },
      select: { id: true }
    });
    return this.getProfile(shopId, user.id);
  }
}
