import { GatewayModule } from './gateway/gateway.module';
import { Module } from '@nestjs/common';
import { RoomModule } from './room/room.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from "@nestjs/config";
import { UserModule } from './user/user.module';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { User,UserSchema} from './user/schemas/user.schema';
import { PassportModule } from '@nestjs/passport';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath : '.env',
      isGlobal: true,
    }),
    GatewayModule,
    MongooseModule.forRoot(process.env.MONGODB_ID),
    PassportModule,
    UserModule,
    RoomModule,
  ],
  controllers: [],
  providers: []
})

export class AppModule {}
