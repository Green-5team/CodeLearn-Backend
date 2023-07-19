import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { Room, RoomSchemas } from './schemas/room.schema'; 
import { UserModule } from 'src/user/user.module';
import { User } from 'src/user/schemas/user.schema';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchemas }]),
  ],
  providers: [RoomService],
  exports: [RoomService],  // Add this line
  controllers: [RoomController],
})
export class RoomModule {}
