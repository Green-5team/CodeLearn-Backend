import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Document, SchemaOptions } from "mongoose";
import { FriendSummary, FriendSummarySchema } from "./auth.friend.schema";

@Schema()
export class Auth extends Document {
    
    @Prop()
    name:string;

    @Prop({
        required: true,
        unique: true,
    })
        
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @Prop({
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @Prop()
    socket_id : string;

    @Prop()
    online: boolean;

    @Prop({default : 1})
    level : number;

    @Prop({default : null})
    nickname: string;
    
    @Prop({default : null})
    socketid : string;

    @Prop({ type: [FriendSummarySchema] })
    friends: FriendSummary[];

    @Prop({})
    friendRequests: string[];
}

export const AuthSchema  = SchemaFactory.createForClass(Auth);