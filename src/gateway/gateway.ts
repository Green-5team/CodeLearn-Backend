import { UserService } from './../user/user.service';
import { Controller, Header, Logger, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { RoomAndUserDto, RoomCreateDto } from 'src/room/dto/room.dto';
import { RoomService } from 'src/room/room.service';
import { jwtSocketIoMiddleware } from './jwt-socket-io.middleware';

@ApiTags('Room')
@UseGuards(jwtSocketIoMiddleware)
@WebSocketGateway({cors : true, namespace: 'room'})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{
    constructor(private readonly roomService: RoomService,
        private readonly userService: UserService, // Add this line    
    ) {}

    private logger = new Logger('Gateway');
    @WebSocketServer() nsp: Namespace;

    afterInit(server: any) {
        this.nsp.adapter.on('create-room', (room) => {
        this.logger.log(`"client sokect id : ${room}"이 생성되었습니다.`);
        });
        this.logger.log('웹소켓 서버 초기화');
    }

    async handleConnection(@ConnectedSocket() socket: Socket) {
        const token = await socket.handshake.headers.authorization;
        this.logger.log(`"${socket.id} socket connected!`);
        this.userService.saveSocketId(token, socket.id);
    }

    async handleDisconnect(@ConnectedSocket() socket: Socket)  {
        const token = await socket.handshake.headers.authorization;
        this.logger.log(`${socket.id} sockect disconnected!`);
        this.userService.deleteSocketId(token);
    }

    @SubscribeMessage('create-room')
    @ApiOperation({ summary: 'Create a new room' })
    async handleCreateRoom(
      @MessageBody() roombodystring: string,
      @ConnectedSocket() socket: Socket

    ): Promise<void> {
        let bearer = await socket.handshake.headers.authorization;
        let token = bearer.split("Bearer ")[1];
        console.log(token);
        console.log("first : ",roombodystring);
        let roomCreateDto = JSON.parse(roombodystring);

        console.log("second : ",roomCreateDto);
        const user = await this.userService.decodeToken(token);
        const room = await this.roomService.createRoom(roomCreateDto, user, socket.id);
        await room.save(); // 변경 사항 저장
        room.socket_id = socket.id; // 소켓 ID 할당
        this.nsp.emit('room-created', "room created!");  
    }

    // @UseGuards(AuthGuard())  토큰 확인하는 정보를 추가. 
    @SubscribeMessage('join-room')
    async handleJoinRoom( 
        @MessageBody() { title }: { title: string },
        @ConnectedSocket() socket: Socket): Promise<void> {
        let bearer = await socket.handshake.headers.authorization;
        let token = bearer.split("Bearer ")[1];
        const condition = await this.roomService.checkRoomCondition(title);

        if(!condition){
            socket.emit("Can't join the room!");
        }
        else {
            const room_id = await this.roomService.getRoomIdFromTitle(title);
            const socket_room= await this.roomService.getSocketId(room_id);
            socket.join(await socket_room);

            const roomAndUserDto = new RoomAndUserDto;
            roomAndUserDto.room_id = await this.roomService.getRoomIdFromTitle(title);
            roomAndUserDto.user_id = await this.userService.decodeToken(token);

            await this.roomService.saveRoomAndUser(roomAndUserDto);
            await this.roomService.chageRoomStatus(roomAndUserDto.room_id);
        }
        // 게임방에 메시지 또는 이벤트를 보낼 수 있음
        // socket.to(socket.id).emit('message', 'Welcome to the game room!');
        this.nsp.emit('enter-room', "enter-room!");  
      }
}