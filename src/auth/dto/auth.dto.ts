import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthDto {

  @IsNotEmpty()
  @ApiProperty({description: "유저email", required: true, type: String})
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({description: "유저password", required: true, type: String})
  password: string;

  @IsOptional()
  @IsString()
  @ApiProperty({description: "유저nickname", type: String})
  nickname?: string;
}

export class CheckDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({description: "확인할email", required: true, type: String})
  email: string;
}

export class SetNicknameDto {
  
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({description: "nickname설정할email", required: true, type: String})
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({description: "nickname설정", required: true, type: String})
  nickname: string;
}

export class friendlistDto {

  @IsString()
  @ApiProperty({description: "nickname", required: true, type: String})
  nickname: string;

  @IsBoolean()
  @ApiProperty({description: "온라인 상태인지 표지", required: true, type: Boolean})
  online: boolean;

  @IsNumber()
  @ApiProperty({description: "친구 유저 레벨", type: Number})
  level: number;

}

