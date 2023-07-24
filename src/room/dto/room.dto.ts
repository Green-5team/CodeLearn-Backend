import { IsString, IsNotEmpty, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { IsEnum, IsOptional, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { RoomStatus } from '../room.model';

@ValidatorConstraint({ async: false })
export class IsPasswordRequiredConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const { status, password } = args.object as RoomCreateDto;
        if (status === RoomStatus.PRIVATE && !password) {
            return false; // password must be defined if status is PRIVATE
        }
        return true; 
    }

    defaultMessage(args: ValidationArguments) {
        return 'Password is required when status is PRIVATE.';
    }
}

export enum RoomMode {
    STUDY = 'STUDY',
    COOPERATIVE  = 'COOPERATIVE'
}

export enum EmptyOrLock {
    EMPTY = "EMPTY",
    LOCK = "LOCK"
}

export class RoomCreateDto {

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    title : string;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    max_members : number;

    @IsEnum(RoomStatus)
    @ApiProperty()
    status : RoomStatus;

    @ApiProperty()
    @Validate(IsPasswordRequiredConstraint,{ message: 'password should not be empty' })
    password : string;

    @ApiProperty()
    @IsNotEmpty()
    level : number;

    @ApiProperty()
    @IsEnum(RoomMode)
    mode : RoomMode;
}

export class RoomAndUserDto {

    @IsNotEmpty()
    @ApiProperty()
    room_id: ObjectId;
  
    @IsNotEmpty()
    @ApiProperty()
    user_info: string[] ;

    @IsNotEmpty()
    @ApiProperty()
    ready_status: boolean[];

}

export class UserInfoDto {


    @ApiProperty()
    nickname : string;
  
    @IsBoolean()
    @ApiProperty()
    status : boolean;
  
    @IsNumber()
    @ApiProperty()
    level : number;
  
}

export class RoomStatusChangeDto {

    @IsNotEmpty()
    @ApiProperty()
    title : string ;

    @IsNotEmpty()
    @ApiProperty()
    member_count: number;

    @IsArray()
    @ApiProperty()
    user_info : (UserInfoDto | EmptyOrLock)[]

    @IsOptional()
    @IsBoolean()
    @ApiProperty()
    currentStatus: boolean;

}

