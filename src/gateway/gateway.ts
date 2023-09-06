import { AuthService } from "./../auth/auth.service";
import { Logger, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import * as jwt from "jsonwebtoken";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Namespace } from "socket.io";
import {
  RoomCreateDto,
  RoomStatusChangeDto,
  UserInfoDto,
} from "src/room/dto/room.dto";
import { RoomService } from "src/room/room.service";
import { UsersService } from "src/users/users.service";
import { jwtSocketIoMiddleware } from "./jwtSocketIo.middleware";
import { CodingTestService } from "src/codingtest/codingtest.service";
import {
  CodeSubmission,
  ExtendedSocket,
  JoinRoomPayload,
  ResponsePayload,
} from "./interface";
import { RoomHandlers } from "./room.handlers";
import { RoomStatusHandlers } from "./roomStatus.handlers";
import { ReviewHandlers } from "./review.handlers";

@ApiTags("Room")
@UseGuards(jwtSocketIoMiddleware)
@WebSocketGateway({ cors: true, namespace: "room" })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private roomHandlers: RoomHandlers;
  private roomStatusHandlers: RoomStatusHandlers;
  private reviewHandlers: ReviewHandlers;
  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UsersService,
    private readonly codingService: CodingTestService,
    private readonly authService: AuthService
  ) {}

  private logger = new Logger("Room");

  @WebSocketServer() nsp: Namespace;
  afterInit(server: any) {
    this.logger.log("Initialized!");
    this.roomHandlers = new RoomHandlers(this.roomService, this.nsp);
    this.roomStatusHandlers = new RoomStatusHandlers(
      this.roomService,
      this.userService,
      this.codingService,
      this.authService,
      this.nsp
    );
    this.reviewHandlers = new ReviewHandlers(
      this.roomService,
      this.codingService,
      this.nsp
    );
  }

  async handleConnection(@ConnectedSocket() socket: ExtendedSocket) {
    if (socket.handshake.headers && socket.handshake.headers.authorization) {
      const token = socket.handshake.headers.authorization.split(" ")[1];

      jwt.verify(
        token,
        process.env.JWT_SECRET,
        async (err: any, decoded: any) => {
          if (err) {
            socket.disconnect();
            return;
          }
          socket.decoded = decoded;
          this.logger.log(`"token 인증 되어있습니다!`);
          this.logger.log(`${socket.id} sockect connected!`);
          const user_id = await this.userService.userInfoFromEmail(
            socket.decoded.email
          );
          socket.user_id = user_id;
          this.authService.saveSocketId(decoded.email, socket.id);
        }
      );
    } else {
      socket.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() socket: ExtendedSocket) {
    const check = await this.roomService.checkWrongDisconnection(
      socket.decoded.email
    );
    if (!check) {
      const result = await this.roomService.changeRoomStatusForLeave(
        socket.room_id,
        socket.user_id
      );
      if (result) {
        const title = await this.roomService.getTitleFromRoomId(socket.room_id);
        socket.leave(await title);
        const roomAndUserInfo = await this.roomService.getRoomInfo(
          socket.room_id
        );
        if (roomAndUserInfo !== false) {
          await this.nsp
            .to(await title)
            .emit("room-status-changed", roomAndUserInfo);
        }
      }
    }
    this.logger.log(`${socket.id} sockect disconnected!`);
  }

  @SubscribeMessage("create-room")
  async handleCreateRoom(
    @MessageBody() roomCreateDto: RoomCreateDto,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<ResponsePayload> {
    return this.roomHandlers.handleCreateRoom(roomCreateDto, socket);
  }

  @SubscribeMessage("join-room")
  async handleJoinRoom(
    @MessageBody() joinRoomPayload: JoinRoomPayload,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<ResponsePayload> {
    return this.roomHandlers.handleJoinRoom(joinRoomPayload, socket);
  }

  @SubscribeMessage("leave-room")
  async handleLeaveRoom(
    @MessageBody("title") title: string,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean }> {
    return this.roomHandlers.handleLeaveRoom(title, socket);
  }

  @SubscribeMessage("quick-join")
  async handleQuickJoinRoom(
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: { roomInfo: string } }> {
    return this.roomHandlers.handleQuickJoinRoom(socket);
  }

  @SubscribeMessage("change-owner")
  async handleChangeOwner(
    @MessageBody("title") title: string,
    @MessageBody("index") userIndex: number,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: { owner: number } }> {
    return this.roomStatusHandlers.handleChangeOwner(title, userIndex, socket);
  }

  @SubscribeMessage("ready")
  async handleReadyUser(
    @MessageBody("title") title: string,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{
    success: boolean;
    payload: { nickname?: string; status?: boolean };
  }> {
    return this.roomStatusHandlers.handleReadyUser(title, socket);
  }

  @SubscribeMessage("reviewUser")
  async handleReviewUser(
    @MessageBody("title") title: string,
    @MessageBody("review") review: boolean,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: any }> {
    return this.reviewHandlers.handleReviewUser(title, review, socket);
  }

  @SubscribeMessage("lockunlock")
  async handlelockAndUnlock(
    @MessageBody("title") title: string,
    @MessageBody("index") index: number,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{
    success: boolean;
    payload: { roomInfo: RoomStatusChangeDto | boolean };
  }> {
    return this.roomStatusHandlers.handlelockAndUnlock(title, index, socket);
  }

  @SubscribeMessage("start")
  async handleStart(
    @MessageBody("title") title: string,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    return this.roomStatusHandlers.handleStart(title, socket);
  }

  @SubscribeMessage("submitCode")
  async handleSubmitCode(
    @MessageBody() codeSubmission: CodeSubmission,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    return this.reviewHandlers.handleSubmitCode(codeSubmission, socket);
  }

  @SubscribeMessage("forceLeave")
  async handleForceLeave(
    @MessageBody("title") title: string,
    @MessageBody("index") index: number,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    return this.roomStatusHandlers.handleForceLeave(title, index, socket);
  }

  @SubscribeMessage("reviewPass")
  async handleReviewPass(
    @MessageBody("title") title: string,
    @MessageBody("review") review: boolean,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    this.reviewHandlers.handleReviewPass(title, review, socket);
  }

  @SubscribeMessage("timer")
  async handleTimer(
    @MessageBody("title") title: string,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    const socketId = await this.authService.getSocketIdByuserId(socket.user_id);

    let timer = 10;
    const interval = setInterval(async () => {
      if (timer >= 0) {
        this.nsp.to(socketId).emit("timer", timer);
        timer--;
      } else {
        clearInterval(interval);
        let firstReviewer;
        let room_problems;
        const reviewOrnot = await this.roomService.checkReviewOrNot(title);
        if (reviewOrnot === true) {
          const roomInfo = await this.roomService.getRoomInfo(socket.room_id);
          outerLoop: if (roomInfo instanceof RoomStatusChangeDto) {
            room_problems = roomInfo.problem_number;
            for (const user of roomInfo.user_info) {
              if (user instanceof UserInfoDto) {
                if (user.review === true) {
                  firstReviewer = user.nickname;
                  break outerLoop;
                }
              }
            }
          }

          const problems = await this.codingService.getProblem(title);
          this.nsp.to(socketId).emit("timeout", {
            success: true,
            review: true,
            roomInfo: roomInfo,
            problems: problems,
            reviewer: firstReviewer,
          });
        } else {
          await this.roomService.resetUserStatus(socket.room_id);
          const roomInfo = await this.roomService.getRoomInfo(socket.room_id);
          this.nsp.to(socketId).emit("timeout", {
            success: true,
            review: false,
            roomInfo: roomInfo,
          });
        }
      }
    }, 1000);
  }
}
