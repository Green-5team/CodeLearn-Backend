import { RoomAndUser } from './../room/schemas/roomanduser.schema';
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
    nickname : String,
    room_id : ObjectId
}
@ApiTags('Room')
@UseGuards(jwtSocketIoMiddleware)
@WebSocketGateway({cors : true, namespace: 'room'})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect{
    constructor(private readonly roomService: RoomService,
        private readonly userService: UsersService, 
    ) {}

    private logger = new Logger('Room');

    @WebSocketServer() nsp: Namespace;
    afterInit(server: any) {
        this.nsp.adapter.on('create-room', (room) => {
        this.logger.log(`"${room}" 이 생성되었습니다.`);
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
        const check = await this.roomService.checkWrongDisconnection(socket.decoded.email);
        if (!check) {
            const result = await this.roomService.changeRoomStatusForLeave(socket.room_id, socket.user_id);
            if(result === "Success"){
                const title = await this.roomService.getTitleFromRoomId(socket.room_id);
                socket.leave(await title);
                const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
                if (roomAndUserInfo !== false) {
                    await this.nsp.to(await title).emit('room-status-changed', roomAndUserInfo);   
                }
            }  
        }
        this.logger.log(`${socket.id} sockect disconnected!`);
    }

    @SubscribeMessage('create-room')
    async handleCreateRoom(
      @MessageBody() roomCreateDto: RoomCreateDto,
      @ConnectedSocket() socket: ExtendedSocket
    ) :Promise <{success : boolean, payload : {roomInfo : RoomStatusChangeDto | boolean}} > {
        const room = await this.roomService.createRoom(roomCreateDto, socket.decoded.email);
        if (!room) {
            this.logger.log(`Room creation failed for email: ${socket.decoded.email}`);
            return { success: false, payload: { roomInfo: false } };
        }
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
        @ConnectedSocket() socket: ExtendedSocket): Promise <{success : boolean} > {
        
        const room_id = await this.roomService.getRoomIdFromTitle(title);
        await this.roomService.changeRoomStatusForLeave(room_id, socket.user_id);

        socket.leave(await title);
  
        const roomAndUserInfo = await this.roomService.getRoomInfo(room_id);
        if (roomAndUserInfo !== false) {
            await this.nsp.to(title).emit('room-status-changed', roomAndUserInfo);   
        }
        return {success : true}  
    }

    @SubscribeMessage('change-owner')
    async handleChangeOwner(
        @MessageBody('title') title : string,  @MessageBody('index') userIndex : number,
        @ConnectedSocket() socket: ExtendedSocket): 
            Promise <{success : boolean, payload : {owner : number}} > {
        
        await this.roomService.changeOwner(socket.room_id, socket.user_id, userIndex);
        const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
        if (roomAndUserInfo !== false) {
            await this.nsp.to(await title).emit('room-status-changed', roomAndUserInfo);   
        }
        return {success : true, payload : {owner : userIndex}}  
    }

    @SubscribeMessage('ready')
    async handleReadyUser(
    @MessageBody('title') title: string,
    @ConnectedSocket() socket: ExtendedSocket
    ): Promise<{ success: boolean; payload:{ nickname?: string, status?: boolean;}}> {
    try {
        const room_id = await this.roomService.getRoomIdFromTitle(title);
        const user_id = await this.userService.userInfoFromEmail(socket.decoded.email);
        const userStatus = await this.roomService.setUserStatusToReady(room_id, user_id);
        const roomAndUserInfo = await this.roomService.getRoomInfo(room_id);

        
        if (roomAndUserInfo instanceof RoomStatusChangeDto) {
            roomAndUserInfo.user_info
            userStatus.status;
            await this.nsp.to(title).emit('room-status-changed', roomAndUserInfo);
            return { success: true, payload: { nickname: userStatus.nickname, status : userStatus.status }};
        } else {
            return { success: false, payload: { nickname: userStatus.nickname, status : userStatus.status }};
        }
    } catch (error) {
        console.error('Error handling ready user', error);
        return { success: false, payload: { nickname: undefined, status : undefined }};
    }
  }

    @SubscribeMessage('reviewUser')
    async handleReviewUser(
    @MessageBody('title') title : string,  @MessageBody('index') index : number,
    @ConnectedSocket() socket: ExtendedSocket
    ): Promise<{success : boolean, payload : {roomInfo : RoomStatusChangeDto | boolean}} >{

        await this.roomService.getResult(socket.room_id, index);

        const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
        await this.nsp.to(title).emit('room-status-changed', roomAndUserInfo);

       return {success : true, payload: { roomInfo : roomAndUserInfo}}  
    }


    @SubscribeMessage('lockunlock')
    async handlelock(
        @MessageBody('title') title: string, @MessageBody('index') index: number,
        @ConnectedSocket() socket : ExtendedSocket
    ): Promise<{success : boolean, payload : {roomInfo : RoomStatusChangeDto | boolean}}> {
        try {
    
    const room_id = await this.roomService.getRoomIdFromTitle(title); //title을 통해서 room_id를 가져오고
    const roomAndUser = await this.roomService.unlockRoom(room_id, index); //room_id와 index를 통해서 unlock혹은 lock시킬 방의 index값과 title값을 반환함
    
    if (!roomAndUser) {
        console.log('No roomAndUser returned');
        return { success: false, payload: { roomInfo: false } };
    }
        
    const roomAndUserInfo = await this.roomService.getRoomInfo(room_id); // room에 변경사항이 발생하였으므로 getRoomInfo를 통해서 정보를 전달해줌
    await this.nsp.to(title).emit('room-status-changed', roomAndUserInfo);
    return {success : true, payload: { roomInfo : roomAndUserInfo}} 
    } catch (error) {
        return { success: false, payload: { roomInfo: false } };
        }
    }
    
    @SubscribeMessage('start')
    async handleStart(
    @MessageBody('title') title : string,
    @ConnectedSocket() socket: ExtendedSocket
    ){
        await this.nsp.to(title).emit('start', { "title" : title });
    }

    @SubscribeMessage('quick-join')
        async handleQuickJoinRoom( 
    @ConnectedSocket() socket: ExtendedSocket): 
    Promise<{ success: boolean, payload: { roomInfo: RoomStatusChangeDto | boolean } }> {

    const email = socket.decoded.email; //token을 통해서 클라이언트의 email정보를 가져옴
    const roomInfo = await this.roomService.findRoomForQuickJoin(email); //email정보를 매개변수로 사용자를 위한 방을 찾는 다.    

    if (!roomInfo) {
        return { success: false, payload: { roomInfo: false } }; //방이 없다면 실패를 반환 
    }

    this.logger.log(`${socket.id} : 방에 입장 준비 중입니다!`);

    socket.join(roomInfo.title);
    this.logger.log(`${socket.id} : Room enter!`);

    const user_id = await this.userService.userInfoFromEmail(email); //email정보를 가지고 user_id를 찾고 
    const objectId = Object(roomInfo.room_id);  // string으로 저장된 정보를 Objectid로 변경해줌->emit으로 전달해 줄 때 ObjectId값으로 찾아서 전달해줘야 하기 때문에

    const isUserInRoom = await this.roomService.isUserInRoom(objectId, user_id); // quick-join의 경우 postman으로 요청을 계속 보내게 되면 요청한 유저가 중복되어 방에 접속하는 현상을 확인함 하여 다른 방에 해당 유저가 있으면 quick-join이 불가능하도록 만듬 
        if (isUserInRoom) {
    this.logger.log(`${socket.id} : 사용자가 이미 방에 입장했습니다!`);
    return { success: false, payload: { roomInfo: false } };
    }

    await this.roomService.changeRoomStatusForJoin(objectId, user_id); //사용자를 방에 추가함
    this.logger.log(`${socket.id} : 방에 입장 완료하였습니다!`);
    const roomAndUserInfo = await this.roomService.getRoomInfo(objectId);//방과 사용자의 정보를 얻는다.
        socket.user_id = user_id;
        socket.room_id = objectId;
    this.nsp.to(roomInfo.title).emit('room-status-changed', roomAndUserInfo); //클라이언트에는 join-room과 동일한 정보를 전달함

    this.nsp.emit('enter-room', "enter-room!");
    return { success: true, payload: { roomInfo: roomAndUserInfo } }; //성공과 방을 정보를 반환 
    }
}
