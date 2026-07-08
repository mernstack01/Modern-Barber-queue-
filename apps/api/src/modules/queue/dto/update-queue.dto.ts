import { ApiPropertyOptional } from "@nestjs/swagger";
import { QueueStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsPhoneNumber, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateQueueDto {
  @ApiPropertyOptional({ example: "Jasur Rahimov" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: "+998901110001" })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: "Fade + Beard" })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({ example: 30, minimum: 0, maximum: 480 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  estimatedWait?: number;

  @ApiPropertyOptional({ example: "Customer asked for beard line-up." })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: QueueStatus })
  @IsOptional()
  @IsEnum(QueueStatus)
  status?: QueueStatus;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;
}
