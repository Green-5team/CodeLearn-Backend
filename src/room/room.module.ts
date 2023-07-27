import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from 'src/auth/auth.module';
import { AuthSchema } from 'src/auth/schemas/auth.schema';
import { UsersModule } from 'src/users/users.module';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { Room, RoomSchemas } from './schemas/room.schema'; 
import { RoomAndUser, RoomAndUserSchema } from './schemas/roomanduser.schema';
@Module({
  imports: [  
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthModule,
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchemas },
      { name: RoomAndUser.name, schema: RoomAndUserSchema },
      { name: 'Auth', schema: AuthSchema },
    ]),
    UsersModule, // UserModule 추가
  ],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}