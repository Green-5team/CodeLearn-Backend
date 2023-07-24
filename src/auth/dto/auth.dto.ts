import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthDto {

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({description: "유저 email", required: true, type: String})
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({description: "유저 password", required: true, type: String})
  password: string;

  @IsOptional()
  @IsString()
  @ApiProperty({description: "유저 nickname", type: String})
  nickname?: string;
}

export class CheckDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({description: "확인할 email", required: true, type: String})
  email: string;
}

export class SetNicknameDto {
  
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({description: "nickname설정할 email", required: true, type: String})
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({description: "nickname설정", required: true, type: String})
  nickname: string;
}

