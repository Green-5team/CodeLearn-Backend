import { AppGateway } from './gateway';
import { Module } from '@nestjs/common';
import { RoomService } from 'src/room/room.service';
import { RoomModule } from 'src/room/room.module';

@Module({
    imports: [RoomModule],
    providers : [AppGateway],
})
export class GatewayModule {}
