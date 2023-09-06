import { UsersService } from "./../users/users.service";
// room.handlers.ts
import { ExtendedSocket } from "./interface";
import { Logger } from "@nestjs/common";
import { Namespace } from "socket.io";
import { RoomService } from "src/room/room.service";
import { RoomStatusChangeDto, TeamDto } from "src/room/dto/room.dto";
import { CodingTestService } from "src/codingtest/codingtest.service";
import { AuthService } from "src/auth/auth.service";

export class RoomStatusHandlers {
  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UsersService,
    private readonly codingService: CodingTestService,
    private readonly authService: AuthService,
    private readonly nsp: Namespace
  ) {}
  private logger = new Logger("Room");

  async handleChangeOwner(
    title: string,
    userIndex: number,
    socket: ExtendedSocket
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

  async handleReadyUser(
    title: string,
    socket: ExtendedSocket
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

  async handlelockAndUnlock(
    title: string,
    index: number,
    socket: ExtendedSocket
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

  async handleStart(title: string, socket: ExtendedSocket) {
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

  async handleForceLeave(title: string, index: number, socket: ExtendedSocket) {
    const userId = this.roomService.getUserIdFromIndex(title, index);
    const userSocketid = this.authService.getSocketIdByuserId(await userId);
    this.nsp.to(await userSocketid).emit("kicked", title);
  }
}
