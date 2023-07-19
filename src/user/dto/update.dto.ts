import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  @ApiProperty()
  readonly email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @ApiProperty()
  readonly password: string;
}
