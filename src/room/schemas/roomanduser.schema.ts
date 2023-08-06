import { Socket } from 'socket.io';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class RoomAndUser extends Document {

  @Prop({ requsired: true, type: String })
  title: string;
  
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  room_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: String })
  mode: string;
  
  @Prop({ required: true, type: [String] })
  user_info: string[] ;

  @Prop({ required: true, type: [Boolean], default : false})
  ready_status : boolean[];

  @Prop({ required: true, type: [Boolean], default : false})
  owner : boolean[];

  @Prop({ required: true, type: [Boolean], default : false})
  solved : boolean[];

  @Prop({ required: true, type: [Boolean], default : false})
  submit: boolean[];
  
  @Prop({ required: true, type: [Boolean], default : false})
  review : boolean[];
  
  @Prop({ type: [String], default : null})
  team: string[];
  
  @Prop({ type: [Number]})
  problem_number: Number[];
}

export const RoomAndUserSchema = SchemaFactory.createForClass(RoomAndUser);
