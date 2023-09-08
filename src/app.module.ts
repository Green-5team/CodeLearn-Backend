import { GatewayModule } from "./gateway/gateway.module";
import { Module } from "@nestjs/common";
import { RoomModule } from "./room/room.module";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CodingtestModule } from "./codingtest/codingtest.module";
import { HttpModule } from "@nestjs/axios";
import { SocketProvider } from "./socket.provider";
import { RoomGateway } from "./webrtc/webrtc.gateway_two";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_ID),
    GatewayModule,
    RoomModule,
    AuthModule,
    UsersModule,
    PassportModule,
    CodingtestModule,
    HttpModule,
    RoomModule,
    RoomGateway,
  ],
  controllers: [],
  providers: [SocketProvider],
})
export class AppModule {}
