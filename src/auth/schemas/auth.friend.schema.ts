import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose";



@Schema()
export class Friendship extends Document {
  @Prop({ ref: 'Auth', required: true })
  user: string; // Reference to the user's ObjectId

  @Prop({ ref: 'Auth', required: true })
  friend: string; // Reference to the friend's ObjectId

  @Prop({ default: false })
  isRequest: boolean; // true if the friendship is a request, false if it's a confirmed friendship

  @Prop({ default: false })
  isConfirmed: boolean; // true if the friendship is confirmed, false if it's still pending

  @Prop({ default: false })
  isBlocked: boolean; // true if the friendship is blocked, false if it's not blocked

  @Prop()
  nickname: string; // Nickname of the friend

  @Prop()
  online: boolean; // Online status of the friend

  @Prop()
  level: number; // Level of the friend
}

@Schema()
export class FriendSummary extends Document {
  @Prop({ ref: 'Auth', required: true })
  user: string; // Reference to the user's ObjectId

  @Prop()
  nickname: string; // Nickname of the friend

  @Prop()
  online: boolean; // Online status of the friend

  @Prop()
  level: number; // Level of the friend
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
export const FriendSummarySchema = SchemaFactory.createForClass(FriendSummary);

