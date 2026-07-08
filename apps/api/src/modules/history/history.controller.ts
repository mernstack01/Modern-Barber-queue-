import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { HistoryService } from "./history.service";

@UseGuards(JwtAuthGuard)
@Controller("history")
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  getHistory(@CurrentUser() user: JwtUser, @Query("date") date?: string, @Query("range") range?: "daily" | "weekly" | "monthly", @Query("search") search?: string, @Query("status") status?: string) {
    return this.historyService.getHistory(user.shopId, { date, range, search, status });
  }
}
