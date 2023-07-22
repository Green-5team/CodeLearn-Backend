import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { Document, SchemaOptions } from "mongoose";
import { UserStatus } from "src/room/room.model";

@Schema()
export class Auth extends Document {
  @Prop()
  name: string;

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
  socket_id: string;

  @Prop()
  online: boolean;

  @Prop({ default: null })
  nickname: string;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.NOT_READY })
  status: UserStatus;
}

export const AuthSchema = SchemaFactory.createForClass(Auth);
