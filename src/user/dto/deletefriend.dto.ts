import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DeleteFriendDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  readonly email: string;

}
