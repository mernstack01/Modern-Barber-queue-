import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { HistoryModule } from "./modules/history/history.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { QueueModule } from "./modules/queue/queue.module";
import { SettingsModule } from "./modules/settings/settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    QueueModule,
    CustomersModule,
    DashboardModule,
    HistoryModule,
    ProfileModule,
    SettingsModule
  ]
})
export class AppModule {}
