import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomersService } from "./customers.service";

@UseGuards(JwtAuthGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query("search") search?: string) {
    return this.customersService.findAll(user.shopId, search);
  }

  @Get(":id")
  findOne(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.customersService.findOne(user.shopId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.shopId, user.sub, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(user.shopId, user.sub, id, dto);
  }

  @Delete(":id")
  delete(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.customersService.delete(user.shopId, user.sub, id);
  }
}
