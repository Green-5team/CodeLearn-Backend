import { CodingTestService } from './../codingtest/codingtest.service';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { Body, Controller, Post, Get, UseGuards, Req, Query } from '@nestjs/common';
import { RoomCreateDto } from './dto/room.dto';
import { Room } from './schemas/room.schema';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from 'src/users/users.service';

@ApiTags('Room')
@Controller('room')
export class RoomController {
    constructor(private roomService: RoomService,
        private readonly userService: UsersService) {}
    
    @ApiOperation({ summary: '입장 가능한 방 보여주기'})
    @ApiResponse({
        status: 200,
        description: 'Success',
        type: Room, // 스키마 클래스 지정
    })

    @UseGuards(AuthGuard('jwt'))
    @Get('/')
    getRoomList(@Req() req, @Query('page') page: number, @Query('level') level: number) {
        if (level) {
            return this.roomService.getRoomList(page,level);
        } else {
            return this.roomService.getRoomList(page);   
        }
    }
    
    @UseGuards(AuthGuard('jwt'))
    @Post('/resultList')
    getResultList(@Req() req, @Body('title') title: string) {
        return this.roomService.getResultList(title);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('/getNickname')
    getNickNameList(@Req() req, @Body('title') title: string) {
        return this.roomService.getNickNameltList(title);
    }

}
