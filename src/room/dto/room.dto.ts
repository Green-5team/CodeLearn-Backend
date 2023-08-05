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
    @ApiProperty({description: "방 제목", required: true, type: String})
    title : string;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({description: "방에 참여할 수 있는 최대 멤버 수", required: true, type: Number})
    max_members : number;

    @IsEnum(RoomStatus)
    @ApiProperty({description: "방 현재 상태, PUBLIC PRIVATE", required: true})
    status : RoomStatus;

    @ApiProperty({description: "방 비밀번호", type: String})
    @Validate(IsPasswordRequiredConstraint,{ message: 'password should not be empty' })
    password : string;

    @ApiProperty({description: "방 레벨", required: true, type: Number})
    @IsNotEmpty()
    level : number;

    @ApiProperty({description: "방 현재 모드, STUDY COOPERATIVE", required: true})
    @IsEnum(RoomMode)
    mode : RoomMode;
}

export class RoomAndUserDto {

    @IsNotEmpty()
    @ApiProperty({description: "방제", required: true})
    title: string;

    @IsNotEmpty()
    @ApiProperty({description: "방 ID", required: true})
    room_id: ObjectId;
  
    @IsNotEmpty()
    @ApiProperty({description: "방 사용자 정보", required: true, type: [String]})
    user_info: string[] ;

    @IsNotEmpty()
    @ApiProperty({description: "방 사용자의 준비 상태", required: true, type: [Boolean]})
    ready_status: boolean[];

    @IsNotEmpty()
    @ApiProperty()
    owner : boolean[];

    @IsNotEmpty()
    @ApiProperty()
    solved: boolean[];
    
    @IsNotEmpty()
    @ApiProperty()
    submit : boolean[];

    @IsNotEmpty()
    @ApiProperty()
    review : boolean[];
}

export class UserInfoDto {

    @ApiProperty({description: "사용자의 닉네임", type: String})
    nickname : string;
  
    @IsBoolean()
    @ApiProperty({description: "사용자의 상태", type: Boolean})
    status : boolean;
  
    @IsNumber()
    @ApiProperty({description: "사용자의 레벨", type: Number})
    level : number;

    @IsNotEmpty()
    @ApiProperty()
    owner : boolean;

    @IsNotEmpty()
    @ApiProperty()
    solved: boolean;
    
    @IsNotEmpty()
    @ApiProperty()
    submit : boolean;

    @IsNotEmpty()
    @ApiProperty()
    review : boolean;
}

export class RoomStatusChangeDto {

    @IsNotEmpty()
    @ApiProperty({description: "방 제목", required: true, type: String})
    title: string;

    @IsNotEmpty()
    @ApiProperty({description: "방 모드", required: true, type: String})
    mode: RoomMode;

    @IsNotEmpty()
    @ApiProperty({description: "방에 참여한 유저 수", required: true, type: Number})
    member_count: number;

    @IsArray()
    @ApiProperty({description: "방의 사용자 정보", required: true})
    user_info : (UserInfoDto | EmptyOrLock)[]

    @IsOptional()
    @IsBoolean()
    @ApiProperty({description: "현재 준비상태", type: Boolean})
    currentStatus: boolean;

    @IsOptional()
    @IsNumber()
    @ApiProperty({description: "현재 최대 맴버 수", type: Number})
    max_members: number; //최대 맴버 수를 추가 room_status_changed에 추가
}

export class RoomListDto {

    @IsNotEmpty()
    @IsString()
    title : string;

    @IsNotEmpty()
    @IsNumber()
    max_members : number;

    @IsNotEmpty()
    @IsNumber()
    member_count: number;

    @IsEnum(RoomStatus)
    status : RoomStatus;

    @IsNotEmpty()
    level: number;
    
    @IsEnum(RoomMode)
    mode: RoomMode;
    
}

