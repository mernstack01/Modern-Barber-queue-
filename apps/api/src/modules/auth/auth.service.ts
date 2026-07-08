import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { shop: true, profile: true }
    });
    if (!user) throw new UnauthorizedException("Invalid phone or password");

    const matches = await bcrypt.compare(dto.password, user.password);
    if (!matches) throw new UnauthorizedException("Invalid phone or password");

    const refreshToken = randomUUID();
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const stored = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    const token = await this.signAccessToken(user, stored.id);

    return {
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        shopId: user.shopId,
        shopName: user.shop.name,
        workingHours: user.profile?.workingHours ?? user.shop.workingHours,
        avatar: user.profile?.avatar ?? user.shop.logo
      }
    };
  }

  async refresh(refreshToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { include: { shop: true, profile: true } } }
    });
    const match = await asyncFind(tokens, (token) => bcrypt.compare(refreshToken, token.tokenHash));
    if (!match) throw new UnauthorizedException("Invalid refresh token");
    return {
      accessToken: await this.signAccessToken(match.user, match.id)
    };
  }

  async logout(userId: string, tokenId?: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, ...(tokenId ? { id: tokenId } : {}), revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return { success: true };
  }

  private signAccessToken(user: { id: string; phone: string; name: string; shopId: string; role: string }, tokenId: string) {
    return this.jwt.signAsync({
      sub: user.id,
      phone: user.phone,
      name: user.name,
      shopId: user.shopId,
      role: user.role,
      tokenId
    });
  }
}

async function asyncFind<T>(items: T[], predicate: (item: T) => Promise<boolean>) {
  for (const item of items) {
    if (await predicate(item)) return item;
  }
  return undefined;
}
