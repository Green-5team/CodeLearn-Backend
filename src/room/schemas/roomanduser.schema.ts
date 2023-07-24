import { Socket } from 'socket.io';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema()
export class RoomAndUser extends Document {

  @ApiProperty({ required: true, type: [String] })
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  room_id: MongooseSchema.Types.ObjectId;

  @ApiProperty({ required: true, type: [String] })
  @Prop({ required: true, type: [String] })
  user_info: string[] ;

  @ApiProperty({ required: true, type: [Boolean], default : false})
  @Prop({ required: true, type: [Boolean], default : false})
  ready_status : boolean[];

}

export const RoomAndUserSchema = SchemaFactory.createForClass(RoomAndUser);
