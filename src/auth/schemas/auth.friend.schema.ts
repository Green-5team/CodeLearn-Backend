import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose";



@Schema()
export class Friendship extends Document {
  @Prop({ ref: 'Auth', required: true })
  user: string; // Reference to the user's ObjectId

  @Prop({ ref: 'Auth', required: true })
  friend: string;

  @Prop({ default: false })
  isRequest: boolean; // true 라면 친구 수락전, false 라면 친구 수락 이후 

  @Prop({ default: false })
  isConfirmed: boolean; // true 라면 친구 수락 상태 , false 라면 아직 친구 수락 대기상태

  @Prop()
  nickname: string; // 친구의 닉네임

  @Prop()
  online: boolean; // 친구의 온라인 상태

  @Prop()
  level: number; // 친구의 레벨
}

@Schema()
export class FriendSummary extends Document {
  @Prop({ ref: 'Auth', required: true })
  user: string; // 유저 ObjectID

  @Prop()
  nickname: string; // 친구의 닉네임

  @Prop()
  online: boolean; // 친구의 온라인 상태

  @Prop()
  level: number; // 친구의 레벨
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
export const FriendSummarySchema = SchemaFactory.createForClass(FriendSummary);