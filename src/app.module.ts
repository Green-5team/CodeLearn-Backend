import { Module } from '@nestjs/common';
import { RoomModule } from './room/room.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from "@nestjs/config";
import { UserModule } from './user/user.module';
import { FriendModule } from './friend/friend.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath : '.env',
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_ID),
    UserModule,
    RoomModule,
    FriendModule,
  ],
  controllers: [],
  providers: []
})

export class AppModule {}
