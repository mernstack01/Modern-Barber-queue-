import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPhoneNumber, IsString, Max, Min, MinLength } from "class-validator";

export class CreateQueueDto {
  @ApiProperty({ example: "Jasur Rahimov" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "+998901110001" })
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({ example: "Classic Cut" })
  @IsString()
  @MinLength(2)
  service!: string;

  @ApiProperty({ example: 20, minimum: 0, maximum: 480 })
  @IsInt()
  @Min(0)
  @Max(480)
  estimatedWait!: number;

  @ApiPropertyOptional({ example: "Prefers low fade." })
  @IsOptional()
  @IsString()
  notes?: string;
}
