import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsPhoneNumber, IsString, MinLength } from "class-validator";

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: "Sardor Aliyev" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: "+998901110003" })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: "Prefers matte finish." })
  @IsOptional()
  @IsString()
  notes?: string;
}
