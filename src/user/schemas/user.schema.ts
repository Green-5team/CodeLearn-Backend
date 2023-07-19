import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Document, SchemaOptions } from "mongoose";

@Schema()

export class User extends Document {
    
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
    online: boolean;
    
    @Prop()
    friend: string[];

    @Prop()
    friendrequest: string[];
}

export const UserSchema  = SchemaFactory.createForClass(User);