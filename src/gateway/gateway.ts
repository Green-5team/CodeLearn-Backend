import { ObjectId } from "mongoose";
import { Logger, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import * as jwt from "jsonwebtoken";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Namespace, Socket } from "socket.io";
import { RoomAndUserDto, RoomCreateDto } from "src/room/dto/room.dto";
import { RoomService } from "src/room/room.service";
import { UsersService } from "src/users/users.service";
import { jwtSocketIoMiddleware } from "./jwt-socket-io.middleware";
import { UserStatus } from "src/room/room.model";

interface ExtendedSocket extends Socket {
  decoded: { email: string };
}

@ApiTags("Room")
@UseGuards(jwtSocketIoMiddleware)
@WebSocketGateway({ cors: true, namespace: "room" })
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UsersService
  ) {}

  private logger = new Logger("Gateway");

  @WebSocketServer() nsp: Namespace;
  afterInit(server: any) {
    this.nsp.adapter.on("create-room", (room) => {
      this.logger.log(`"client sokect id : ${room}"이 생성되었습니다.`);
    });
  }

  async handleConnection(@ConnectedSocket() socket: ExtendedSocket) {
    if (socket.handshake.headers && socket.handshake.headers.authorization) {
      const token = socket.handshake.headers.authorization.split(" ")[1];

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

  async handleDisconnect(@ConnectedSocket() socket: ExtendedSocket) {
    this.logger.log(`${socket.id} sockect disconnected!`);
  }

  @SubscribeMessage("create-room")
  @ApiOperation({ summary: "Create a new room" })
  async handleCreateRoom(
    @MessageBody() roomCreateDto: RoomCreateDto,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: { title: string } }> {
    const room = await this.roomService.createRoom(
      roomCreateDto,
      socket.decoded.email,
      socket.id
    );
    await room.save();
    room.socket_id = socket.id;
    this.nsp.emit("room-created", "room created!");
    return { success: true, payload: { title: roomCreateDto.title } };
  }

  // @UseGuards(AuthGuard())  토큰 확인하는 정보를 추가.
  @SubscribeMessage("join-room")
  async handleJoinRoom(
    @MessageBody("title") title: string,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: { title: string } }> {
    this.logger.log(`${socket.id} : 방에 입장 준비 중입니다!`);
    const condition = await this.roomService.checkRoomCondition(title);
    if (!condition) {
      socket.emit("Can't join the room!");
    } else {
      console.log(" 방을 찾는 중입니다 ");
      const room_id = await this.roomService.getRoomIdFromTitle(title);
      const socket_id_room = await this.roomService.getSocketId(room_id);
      socket.join(await socket_id_room);

      const user = await this.userService.userInfoFromEmail(
        socket.decoded.email
      );

      const roomAndUserDto = new RoomAndUserDto();
      roomAndUserDto.room_id = room_id;
      roomAndUserDto.user_id = user._id;
      roomAndUserDto.socket_id = socket.id;

      await this.roomService.saveRoomAndUser(roomAndUserDto);
      await this.roomService.chageRoomStatus(roomAndUserDto.room_id);
    }
    this.nsp.emit("enter-room", "enter-room!");
    return { success: true, payload: { title: title } };
  }

  //{ data : ready }로 요청
  @SubscribeMessage("ready")
  async handleReady(
    @ConnectedSocket() socket: Socket
  ): Promise<{ success: boolean; message: string }> {
    const token = socket.handshake.headers.authorization?.split(" ")[1];
    const userId = await this.userService.readyToken(token);
    const updatedUser = await this.userService.updateUserStatus(
      userId,
      UserStatus.READY
    );

    socket.broadcast.emit("user-status-updated", {
      userId: userId,
      status: updatedUser.status,
    });

    return {
      success: true,
      message: "User status updated to READY successfully",
    };
  }

  // @SubscribeMessage("ready-to-start")
  // async handleReadytoStart(
  //   @ConnectedSocket() socket: Socket
  // ): Promise<{ success: boolean; message: string }> {
  //   const token = socket.handshake.headers.authorization?.split(" ")[1];
  //   const;
  // }
}
