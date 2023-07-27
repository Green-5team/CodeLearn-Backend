import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompileResultDto {

  @IsNotEmpty()
  output: string;

  @IsNotEmpty()
  statuscode: string;

  @IsNotEmpty()
  memory: string;
  
  @IsNotEmpty()
  cputime : string
}