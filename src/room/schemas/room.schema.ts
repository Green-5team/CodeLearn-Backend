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
    @ApiProperty()
    @Prop({
        required: true,
        unique: true,
    })
    title : string;

    @ApiProperty()
    @Prop({ default: 1 })
    member_count : number;

    @ApiProperty()
    @Prop({required: true})
    max_members : number;

    @ApiProperty()
    @Prop({required: true})
    status : RoomStatus;
    
    @ApiProperty()
    @Prop()
    password : string;
    
    @ApiProperty()
    @Prop({required: true, default : 1})
    level : number;

    @ApiProperty()
    @Prop({required: true, default : 'STUDY'})
    mode : RoomMode;

    @ApiProperty()
    @Prop({default : true})
    ready : boolean; 

    @ApiProperty()
    @Prop()
    create_time : Date;
}

export const RoomSchemas  = SchemaFactory.createForClass(Room);

function ApiModelProperty() {
    throw new Error("Function not implemented.");
}
