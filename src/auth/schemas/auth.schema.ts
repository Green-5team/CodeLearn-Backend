import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Document, SchemaOptions } from "mongoose";

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
    nickname : string;

}

export const AuthSchema  = SchemaFactory.createForClass(Auth);