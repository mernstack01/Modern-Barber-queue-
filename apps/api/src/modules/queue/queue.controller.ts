import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateQueueDto } from "./dto/create-queue.dto";
import { ReorderQueueDto } from "./dto/reorder-queue.dto";
import { UpdateQueueDto } from "./dto/update-queue.dto";
import { QueueService } from "./queue.service";

@UseGuards(JwtAuthGuard)
@Controller("queue")
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("today") today?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.queueService.findAll(user.shopId, { search, status, today: today === "true", page: Number(page ?? 1), limit: Number(limit ?? 25) });
  }

  @Get(":id")
  findOne(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.queueService.findOneForShop(user.shopId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateQueueDto) {
    return this.queueService.create(user.shopId, user.sub, dto);
  }

  @Post("reorder")
  reorder(@CurrentUser() user: JwtUser, @Body() dto: ReorderQueueDto) {
    return this.queueService.reorder(user.shopId, dto.orderedIds);
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: UpdateQueueDto) {
    return this.queueService.update(user.shopId, user.sub, id, dto);
  }

  @Delete(":id")
  delete(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.queueService.delete(user.shopId, user.sub, id);
  }

  @Post(":id/call")
  call(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.queueService.call(user.shopId, user.sub, id);
  }

  @Post(":id/start")
  start(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.queueService.start(user.shopId, user.sub, id);
  }

  @Post(":id/finish")
  finish(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.queueService.finish(user.shopId, user.sub, id);
  }
}
