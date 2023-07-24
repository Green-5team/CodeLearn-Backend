import { ObjectId } from 'mongoose';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { RoomAndUserDto, RoomCreateDto, RoomStatusChangeDto } from 'src/room/dto/room.dto';
import { RoomService } from 'src/room/room.service';
import { UsersService } from 'src/users/users.service';
import { jwtSocketIoMiddleware } from './jwt-socket-io.middleware';



interface ExtendedSocket extends Socket {
    decoded : {email :string},
    user_id : ObjectId,
    room_id : ObjectId
}

@ApiTags('Room')
@UseGuards(jwtSocketIoMiddleware)
@WebSocketGateway({cors : true, namespace: 'room'})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect{
    constructor(private readonly roomService: RoomService,
        private readonly userService: UsersService, 
    ) {}

    private logger = new Logger('Gateway');

    @WebSocketServer() nsp: Namespace;
    afterInit(server: any) {
        this.nsp.adapter.on('create-room', (room) => {
        this.logger.log(`"client sokect id : ${room}"이 생성되었습니다.`);
        });
    }

    async handleConnection(@ConnectedSocket()  socket: ExtendedSocket) {
        if (socket.handshake.headers && socket.handshake.headers.authorization) {
            const token = socket.handshake.headers.authorization.split(' ')[1]; 
        
            jwt.verify(token, process.env.JWT_SECRET, (err: any, decoded: any) => {
            if (err) {
                socket.disconnect();
                return;
            }
            socket.decoded = decoded;
            this.logger.log(`"token 인증 되어있습니다!`);
            });
          } else {
            socket.disconnect(); // 연결을 끊음
          }
    }

    async handleDisconnect(@ConnectedSocket() socket: ExtendedSocket)  {
   
        await this.roomService.changeRoomStatusForLeave(socket.room_id, socket.user_id);
        const title = this.roomService.getTitleFromRoomId(socket.room_id);
        socket.leave(await title);
        this.logger.log(`${socket.id} sockect disconnected!`);

        const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
        if (roomAndUserInfo !== false) {
            await this.nsp.to(await title).emit('room-status-changed', roomAndUserInfo);   
        }
    }

    @SubscribeMessage('create-room')
    @ApiOperation({ summary: 'Create a new room' })
    async handleCreateRoom(
      @MessageBody() roomCreateDto: RoomCreateDto,
      @ConnectedSocket() socket: ExtendedSocket
    ) :Promise <{success : boolean, payload : {roomInfo : RoomStatusChangeDto | boolean}} > {
        const room = await this.roomService.createRoom(roomCreateDto, socket.decoded.email);
        await room.save(); 
        const user_id = await this.userService.userInfoFromEmail(socket.decoded.email);
        socket.user_id = user_id;
        socket.join(room.title); 
        const room_id = await this.roomService.getRoomIdFromTitle(roomCreateDto.title);
        socket.room_id = room_id;
        const roomAndUserInfo = await this.roomService.getRoomInfo(room_id);
        this.nsp.emit('room-created', "room created!");
        return {success : true,  payload: { roomInfo : roomAndUserInfo}}
    }

    @SubscribeMessage('join-room')
    async handleJoinRoom( 
        @MessageBody('title') title: string,
        @ConnectedSocket() socket: ExtendedSocket): 
        Promise <{success : boolean, payload : {roomInfo : RoomStatusChangeDto | boolean}} > {

        this.logger.log(`${socket.id} : 방에 입장 준비 중입니다!`);
        const condition = await this.roomService.checkRoomCondition(title);
        let roomAndUserInfo: RoomStatusChangeDto | boolean;
        if(!condition){
            socket.emit("Can't join the room!");
        }
        else {
            const room_id = await this.roomService.getRoomIdFromTitle(title);
            socket.join(await title);

            this.logger.log(`${socket.id} : Room enter!`);

            const user_id = await this.userService.userInfoFromEmail(socket.decoded.email);
            socket.user_id = user_id;
            socket.room_id = room_id;
            await this.roomService.changeRoomStatusForJoin(room_id, user_id);
            
            roomAndUserInfo = await this.roomService.getRoomInfo(room_id);
            this.nsp.to(title).emit('room-status-changed', roomAndUserInfo);
        }
        this.logger.log(`${socket.id} : 방에 입장 완료하였습니다!`);
        this.nsp.emit('enter-room', "enter-room!");
        return {success : true, payload: { roomInfo : roomAndUserInfo}}  
      }

    @SubscribeMessage('leave-room')
    async handleLeaveRoom(
        @MessageBody('title') title : string,
        @ConnectedSocket() socket: ExtendedSocket): 
        Promise <{success : boolean} > {
        
        const room_id = await this.roomService.getRoomIdFromTitle(title);
        await this.roomService.changeRoomStatusForLeave(room_id, socket.user_id);

        socket.leave(await title);
  

        const roomAndUserInfo = await this.roomService.getRoomInfo(room_id);
        if (roomAndUserInfo !== false) {
            await this.nsp.to(title).emit('room-status-changed', roomAndUserInfo);   
        }
        return {success : true}  
        }
       
    @SubscribeMessage('ready')
    async handleReadyUser(
        @MessageBody('title') title: string,
        @ConnectedSocket() socket: ExtendedSocket
    ): Promise<{ success: boolean; payload:{ readyStatus?: boolean;}}> {
        let currentStatus: boolean;
        try {
            const room_id = await this.roomService.getRoomIdFromTitle(title);
            const user_id = await this.userService.userInfoFromEmail(socket.decoded.email);
            const currentStatus = await this.roomService.setUserStatusToReady(room_id, user_id);
            const roomAndUserInfo = await this.roomService.getRoomInfo(room_id);
                
            if (roomAndUserInfo instanceof RoomStatusChangeDto) {
                roomAndUserInfo.currentStatus = currentStatus;
                await this.nsp.to(title).emit('status-changed', roomAndUserInfo);
                return { success: true, payload: { readyStatus : currentStatus }};
            } else {
                return { success: false, payload: { readyStatus : currentStatus }};
            }
        } catch (error) {
            console.error('Error handling ready user:', error);
            return { success: false, payload: { readyStatus : currentStatus }};
        }
    }
}
