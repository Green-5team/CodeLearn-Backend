import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Controller } from '@nestjs/common';

export class GetoneDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  @ApiProperty()
  readonly email: string;
}
