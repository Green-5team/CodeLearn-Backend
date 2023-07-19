import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { RoomCreateDto } from './dto/room.dto';

@ApiTags('Room')
@Controller('room')
export class RoomController {
    constructor(private roomService: RoomService) {}
    @ApiOperation({ summary: '해당 기능은 사용하지 않는 API 입니다, 소켓 create-room 호출시 클라이언트에서 제공해야 되는 값을 나타내기 위해 작성되었습니다. '})
    @Post('/create-room')
    @UsePipes(new ValidationPipe())
    createRoom(
        @Body() roomCreateDto : RoomCreateDto 
    ): Promise<RoomCreateDto>{
        return this.roomService.createRoom(roomCreateDto);
    }
}
