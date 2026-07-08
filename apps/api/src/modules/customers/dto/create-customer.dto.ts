import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsPhoneNumber, IsString, MinLength } from "class-validator";

export class CreateCustomerDto {
  @ApiProperty({ example: "Sardor Aliyev" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "+998901110003" })
  @IsPhoneNumber()
  phone!: string;

  @ApiPropertyOptional({ example: "Usually visits on weekends." })
  @IsOptional()
  @IsString()
  notes?: string;
}
