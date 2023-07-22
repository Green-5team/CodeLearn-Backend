import { Socket } from "socket.io";
import { Document, Schema as MongooseSchema } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema()
export class RoomAndUser extends Document {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  room_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop()
  socket_id: string;
}

export const RoomAndUserSchema = SchemaFactory.createForClass(RoomAndUser);
