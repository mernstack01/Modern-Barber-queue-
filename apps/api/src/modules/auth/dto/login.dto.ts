import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsPhoneNumber, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "+998901234567" })
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({ example: "password123", minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
