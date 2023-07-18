import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectFriendDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  readonly email: string;

}
