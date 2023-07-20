import { Controller, Logger } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
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
import { RoomCreateDto } from "src/room/dto/room.dto";
import { RoomService } from "src/room/room.service";

@ApiTags("Room")
@WebSocketGateway({ cors: true, namespace: "room" })
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly roomService: RoomService) {}

  private logger = new Logger("Gateway");
  @WebSocketServer() nsp: Namespace;

  afterInit(server: any) {
    this.nsp.adapter.on("create-room", (room) => {
      this.logger.log(`"Room:${room}"이 생성되었습니다.`);
    });

    this.logger.log("웹소켓 서버 초기화");
  }

  handleConnection(@ConnectedSocket() socket: Socket) {
    this.logger.log(`"${socket.id} socket connected!`);
    socket.broadcast.emit("message", {
      message: `${socket.id}가 들어왔습니다.`,
    });
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    this.logger.log(`${socket.id} sockect disconnected!`);
  }
  @SubscribeMessage("create-room")
  @ApiOperation({ summary: "Create a new room" })
  async handleCreateRoom(
    @MessageBody() roomCreateDto: RoomCreateDto
  ): Promise<void> {
    const room = await this.roomService.createRoom(roomCreateDto);
    this.nsp.emit("room-created", room);
  }
}
