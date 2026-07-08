import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsPhoneNumber, IsString, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Atlas Barber Studio" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  shopName?: string;

  @ApiPropertyOptional({ example: "Aziz Karimov" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: "+998901234567" })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: "09:00 - 20:00" })
  @IsOptional()
  @IsString()
  workingHours?: string;

  @ApiPropertyOptional({ example: "Amir Temur Avenue 24, Tashkent" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "https://example.com/avatar.jpg" })
  @IsOptional()
  @IsString()
  avatar?: string;
}
