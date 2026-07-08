import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsPhoneNumber, IsString } from "class-validator";

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: "Atlas Barber Studio" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "+998901234567" })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: "Amir Temur Avenue 24, Tashkent" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "https://example.com/logo.png" })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: "09:00 - 20:00" })
  @IsOptional()
  @IsString()
  workingHours?: string;

  @ApiPropertyOptional({ example: { defaultEstimatedWait: 20, autoPosition: true } })
  @IsOptional()
  queueSettings?: Record<string, unknown>;

  @ApiPropertyOptional({ example: "system" })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({ example: "en" })
  @IsOptional()
  @IsString()
  language?: string;
}
