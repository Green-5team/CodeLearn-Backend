import { TeamDto } from "./../room/dto/room.dto";
import { AuthService } from "./../auth/auth.service";
import { Logger, Req, UseGuards } from "@nestjs/common";
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
import { Namespace, Socket } from "socket.io";
import {
  RoomCreateDto,
  RoomStatusChangeDto,
  UserInfoDto,
} from "src/room/dto/room.dto";
import { RoomService } from "src/room/room.service";
import { UsersService } from "src/users/users.service";
import { jwtSocketIoMiddleware } from "./jwt-socket-io.middleware";
import { CodingTestService } from "src/codingtest/codingtest.service";
import { CompileResultDto } from "src/codingtest/dto/compileresult.dto";
import {
  CodeSubmission,
  ExtendedSocket,
  JoinRoomPayload,
  ResponsePayload,
} from "./interface";
import { userInfo } from "os";
import { RoomHandlers } from "./room.handlers";

@ApiTags("Room")
@UseGuards(jwtSocketIoMiddleware)
@WebSocketGateway({ cors: true, namespace: "room" })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private roomHandlers: RoomHandlers;
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
      socket.disconnect(); // 연결을 끊음
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

  @SubscribeMessage("change-owner")
  async handleChangeOwner(
    @MessageBody("title") title: string,
    @MessageBody("index") userIndex: number,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: { owner: number } }> {
    await this.roomService.changeOwner(
      socket.room_id,
      socket.user_id,
      userIndex
    );
    const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
    if (roomAndUserInfo !== false) {
      await this.nsp
        .to(await title)
        .emit("room-status-changed", roomAndUserInfo);
    }
    return { success: true, payload: { owner: userIndex } };
  }

  @SubscribeMessage("ready")
  async handleReadyUser(
    @MessageBody("title") title: string,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{
    success: boolean;
    payload: { nickname?: string; status?: boolean };
  }> {
    try {
      const room_id = await this.roomService.getRoomIdFromTitle(title);
      const user_id = await this.userService.userInfoFromEmail(
        socket.decoded.email
      );
      const userStatus = await this.roomService.setUserStatusToReady(
        room_id,
        user_id
      );
      const roomAndUserInfo = await this.roomService.getRoomInfo(room_id);

      if (
        roomAndUserInfo instanceof RoomStatusChangeDto ||
        roomAndUserInfo instanceof TeamDto
      ) {
        roomAndUserInfo.user_info;
        userStatus.status;
        await this.nsp.to(title).emit("room-status-changed", roomAndUserInfo);
        return {
          success: true,
          payload: { nickname: userStatus.nickname, status: userStatus.status },
        };
      } else {
        return {
          success: false,
          payload: { nickname: userStatus.nickname, status: userStatus.status },
        };
      }
    } catch (error) {
      console.error("Error handling ready user", error);
      return {
        success: false,
        payload: { nickname: undefined, status: undefined },
      };
    }
  }

  @SubscribeMessage("reviewUser")
  async handleReviewUser(
    @MessageBody("title") title: string,
    @MessageBody("review") review: boolean,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: any }> {
    const checkReuslt = await this.roomService.getResult(
      socket.room_id,
      socket.user_id,
      review
    );

    if (checkReuslt === false) {
      return {
        success: false,
        payload: { message: "버튼을 클릭할 수 없습니다." },
      };
    }

    const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
    await this.nsp.to(title).emit("room-status-changed", roomAndUserInfo);

    return { success: true, payload: { roomInfo: roomAndUserInfo } };
  }

  @SubscribeMessage("lockunlock")
  async handlelock(
    @MessageBody("title") title: string,
    @MessageBody("index") index: number,
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{
    success: boolean;
    payload: { roomInfo: RoomStatusChangeDto | boolean };
  }> {
    try {
      const room_id = await this.roomService.getRoomIdFromTitle(title);
      const roomAndUser = await this.roomService.unlockRoom(room_id, index);

      if (!roomAndUser) {
        console.log("No roomAndUser returned");
        return { success: false, payload: { roomInfo: false } };
      }

      const roomAndUserInfo = await this.roomService.getRoomInfo(room_id);
      await this.nsp.to(title).emit("room-status-changed", roomAndUserInfo);
      return { success: true, payload: { roomInfo: roomAndUserInfo } };
    } catch (error) {
      return { success: false, payload: { roomInfo: false } };
    }
  }

  @SubscribeMessage("start")
  async handleStart(
    @MessageBody("title") title: string,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    const roomInfo = this.roomService.getRoomById(socket.room_id);
    const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
    let userInfo;
    if (roomAndUserInfo instanceof TeamDto) {
      userInfo = roomAndUserInfo.user_info;
    }
    await this.codingService.getRandomProblem(title);
    if ((await roomInfo).mode === "COOPERATIVE") {
      const balance = await this.roomService.checkBalanceTeam(socket.room_id);
      if (balance === false) {
        console.log("각 팀의 인원수가 일치하지 않습니다.");
        return {
          success: false,
          payload: { message: "각 팀의 인원수가 일치해야합니다." },
        };
      }
    }
    await this.nsp.to(title).emit("start", { title: title });
    if (roomAndUserInfo instanceof TeamDto) {
      console.log(userInfo);
      return {
        success: true,
        payload: { userInfo: userInfo, message: "게임이 시작되었습니다." },
      };
    } else {
      return { success: true, payload: { message: "게임이 시작되었습니다." } };
    }
  }

  @SubscribeMessage("quick-join")
  async handleQuickJoinRoom(
    @ConnectedSocket() socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: { roomInfo: string } }> {
    const email = socket.decoded.email;
    const roomInfo = await this.roomService.findRoomForQuickJoin();

    if (!roomInfo) {
      return {
        success: false,
        payload: { roomInfo: "입장할 수 있는 방이 없습니다." },
      };
    }
    return { success: true, payload: { roomInfo: roomInfo.title } };
  }

  @SubscribeMessage("submitCode")
  async handleSubmitCode(
    @MessageBody() codeSubmission: CodeSubmission,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    const userOutputResult = [];
    const problem = await this.codingService.getProblemInput(
      codeSubmission.problemNumber
    );
    let result;
    let quiz_result = false;
    if (codeSubmission.script !== "") {
      for (const index of problem.input) {
        result = await this.codingService.executeCode(
          codeSubmission.script,
          codeSubmission.language,
          codeSubmission.versionIndex,
          index
        );
        if (!(result instanceof CompileResultDto)) {
          return {
            success: false,
            payload: { message: "제출을 실패했습니다. 다시 시도해주세요." },
          };
        }
        const resultOutput = result.output.replace(/\n/g, "");
        userOutputResult.push(resultOutput);
      }

      if (
        userOutputResult.length == problem.output.length &&
        userOutputResult.every(
          (value, index) => value === problem.output[index]
        )
      ) {
        await this.codingService.saveSolvedInfo(
          socket.decoded.email,
          codeSubmission.title
        );
        quiz_result = true;
      } else {
        const checkMode = await this.roomService.checkModeForCoop(
          codeSubmission.title
        );
        if (checkMode) {
          return {
            success: false,
            payload: { message: "틀렸습니다! 다시 시도해주세요." },
          };
        }
      }
    } else {
      const compileResult = new CompileResultDto();
      compileResult.output = "0";
      compileResult.memory = "0";
      compileResult.statuscode = "0";
      compileResult.cputime = "0";
      result = compileResult;
    }

    await this.codingService.saveSubmitInfo(
      socket.decoded.email,
      codeSubmission.title
    );
    const finish = await this.codingService.checkFinish(codeSubmission.title);

    if (finish.success == true) {
      if (finish.mode !== "STUDY") {
        await this.nsp.to(codeSubmission.title).emit("finishedGame", {
          title: codeSubmission.title,
          winner: finish.mode,
        });
      } else {
        await this.nsp
          .to(codeSubmission.title)
          .emit("finishedGame", { title: codeSubmission.title });
      }
    }

    let roomStatusChangeDto = new RoomStatusChangeDto();
    const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
    if (typeof roomAndUserInfo !== "boolean") {
      roomStatusChangeDto = roomAndUserInfo;
    }
    return {
      success: true,
      payload: {
        quiz_result: quiz_result,
        result: result,
        user_info: roomStatusChangeDto.user_info,
      },
    };
  }

  @SubscribeMessage("forceLeave")
  async handleForceLeave(
    @MessageBody("title") title: string,
    @MessageBody("index") index: number,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    const userId = this.roomService.getUserIdFromIndex(title, index);
    const userSocketid = this.authService.getSocketIdByuserId(await userId);
    this.nsp.to(await userSocketid).emit("kicked", title);
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

  @SubscribeMessage("reviewPass")
  async handleReviewPass(
    @MessageBody("title") title: string,
    @MessageBody("review") review: boolean,
    @ConnectedSocket() socket: ExtendedSocket
  ) {
    const check = await this.roomService.getResult(
      socket.room_id,
      socket.user_id,
      review
    );
    if (check === false) {
      return {
        success: false,
        payload: { message: "다시 버튼을 눌러주세요." },
      };
    }
    const reveiwAll = await this.roomService.checkReviewOrNot(title);
    const roomInfo = await this.roomService.getRoomInfo(socket.room_id);

    if (reveiwAll === false) {
      await this.roomService.resetUserStatus(socket.room_id);
      const roomInfo = await this.roomService.getRoomInfo(socket.room_id);
      this.nsp.to(title).emit("reviewFinished", roomInfo);
    } else {
      let reviewer;
      outerLoop: if (
        roomInfo instanceof RoomStatusChangeDto ||
        roomInfo instanceof TeamDto
      ) {
        for (const user of roomInfo.user_info) {
          if (user instanceof UserInfoDto) {
            if (user.review === true) {
              reviewer = user.nickname;
              break outerLoop;
            }
          }
        }
      }
      this.nsp.to(title).emit("room-status-changed", {
        roomInfo: roomInfo,
        reviewer: reviewer,
      });
    }

    return { success: false, payload: { message: "" } };
  }
}
