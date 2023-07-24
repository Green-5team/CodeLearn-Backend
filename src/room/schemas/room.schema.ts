import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import { ApiProperty } from "@nestjs/swagger";
import { Document, SchemaOptions } from "mongoose";

export enum RoomStatus {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
}

export enum RoomMode {
    STUDY = 'STUDY',
    COOPERATIVE  = 'COOPERATIVE'
}

@Schema({
    timestamps : true
})

export class Room extends Document {
    @ApiProperty({ description: "방 제목", required: true, type: String })
    @Prop({
        required: true,
        unique: true,
    })
    title : string;

    @ApiProperty({ description: "방에 있는 멤버의 수", type: Number, default: 1 })
    @Prop({ default: 1 })
    member_count : number;

    @ApiProperty({ description: "방에 참여할 수 있는 최대 멤버 수", required: true, type: Number })
    @Prop({ required: true })
    max_members : number;

    @ApiProperty({ description: "방의 현재 상태 : PUBLIC PRIVATE", required: true })
    @Prop({ required: true })
    status : RoomStatus;
    
    @ApiProperty({ description: "방에 접근하기 위한 비밀번호", type: String })
    @Prop()
    password : string;
    
    @ApiProperty({ description: "방 레벨", required: true, type: Number, default: 1 })
    @Prop({ required: true, default: 1 })
    level : number;

    @ApiProperty({ description: "방의 현재 모드 : PUBLIC, PRIVATE", required: true, default: 'STUDY' })
    @Prop({ required: true, default: 'STUDY' })
    mode : RoomMode;

    @ApiProperty({ description: "방이 준비 상태인지 여부", type: Boolean, default: true })
    @Prop({ default: true })
    ready : boolean; 

    @ApiProperty({ description: "방 생성된 시간", type: Date })
    @Prop()
    create_time : Date;
}

export const RoomSchemas  = SchemaFactory.createForClass(Room);

function ApiModelProperty() {
    throw new Error("Function not implemented.");
}
