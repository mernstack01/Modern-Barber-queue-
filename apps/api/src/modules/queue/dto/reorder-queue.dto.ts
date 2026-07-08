import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class ReorderQueueDto {
  @ApiProperty({ type: [String], example: ["queue-id-1", "queue-id-2"] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds!: string[];
}
