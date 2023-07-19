import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LostDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  @ApiProperty()
  readonly email: string;

}
