import { AppGateway } from './gateway';
import { Module } from '@nestjs/common';
import { RoomModule } from 'src/room/room.module';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { CodingtestModule } from 'src/codingtest/codingtest.module';
import { AuthModule } from 'src/auth/auth.module';
@Module({
    imports: [AuthModule,UsersModule, RoomModule, CodingtestModule],
    providers : [AppGateway],
})
export class GatewayModule {}
