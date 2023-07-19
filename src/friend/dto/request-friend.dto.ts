import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestFriendDto {
  @IsNotEmpty()
  @ApiProperty()
  @IsEmail({}, { message: 'Please enter correct email' })
  readonly email: string;

}
