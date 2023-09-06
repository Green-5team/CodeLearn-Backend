// room.handlers.ts
import { ExtendedSocket, JoinRoomPayload, ResponsePayload } from "./interface";
import { Logger } from "@nestjs/common";
import { Namespace } from "socket.io";
import { RoomService } from "src/room/room.service";
import { RoomCreateDto, RoomStatusChangeDto } from "src/room/dto/room.dto";

export class RoomHandlers {
  constructor(
    private readonly roomService: RoomService,
    private readonly nsp: Namespace
  ) {}
  private logger = new Logger("Room");

  async handleCreateRoom(
    roomCreateDto: RoomCreateDto,
    socket: ExtendedSocket
  ): Promise<ResponsePayload> {
    const dup_check = await this.roomService.duplicationCheck(
      roomCreateDto.title
    );
    if (!dup_check) {
      return { success: false, payload: { message: "중복된 방제입니다." } };
    }
    const room = await this.roomService.createRoom(
      roomCreateDto,
      socket.decoded.email,
      socket.user_id
    );

    if (!room) {
      this.logger.log(`Room creation failed : ${socket.decoded.email}`);
      return {
        success: false,
        payload: { message: "방을 생성 할 수 없습니다. 다시 시도해주세요." },
      };
    }
    await room.save();
    socket.join(room.title);
    const room_id = await this.roomService.getRoomIdFromTitle(
      roomCreateDto.title
    );
    socket.room_id = room_id;

    const roomAndUserInfo = await this.roomService.getRoomInfo(room_id);
    if (roomAndUserInfo == null || false || undefined) {
      return {
        success: false,
        payload: { message: "방을 생성 할 수 없습니다. 다시 시도해주세요." },
      };
    }
    this.nsp
      .to(roomCreateDto.title)
      .emit("room-status-changed", roomAndUserInfo);
    return { success: true, payload: { roomInfo: roomAndUserInfo } };
  }

  async handleJoinRoom(
    joinRoomPayload: JoinRoomPayload,
    socket: ExtendedSocket
  ): Promise<ResponsePayload> {
    this.logger.log(`${socket.id} : 방에 입장 준비 중입니다!`);
    const condition = await this.roomService.checkRoomCondition(
      joinRoomPayload.title
    );
    const passwordcheck = await this.roomService.checkRoomPassword(
      joinRoomPayload.title,
      joinRoomPayload.password
    );

    let roomAndUserInfo: RoomStatusChangeDto | boolean;

    if (!condition) {
      return {
        success: false,
        payload: { message: "방에 입장 할 수 없습니다." },
      };
    } else if (!passwordcheck) {
      return {
        success: false,
        payload: { message: "방 비밀번호가 일치하지 않습니다." },
      };
    } else {
      const room_id = await this.roomService.getRoomIdFromTitle(
        joinRoomPayload.title
      );
      socket.join(await joinRoomPayload.title);
      socket.room_id = room_id;

      await this.roomService.changeRoomStatusForJoin(room_id, socket.user_id);

      roomAndUserInfo = await this.roomService.getRoomInfo(room_id);
      this.nsp
        .to(joinRoomPayload.title)
        .emit("room-status-changed", roomAndUserInfo);
    }
    this.logger.log(`${socket.id} : 방에 입장 완료하였습니다!`);

    return { success: true, payload: { roomInfo: roomAndUserInfo } };
  }

  async handleLeaveRoom(
    title: string,
    socket: ExtendedSocket
  ): Promise<{ success: boolean }> {
    const room_id = await this.roomService.getRoomIdFromTitle(title);
    await this.roomService.changeRoomStatusForLeave(room_id, socket.user_id);

    socket.leave(await title);

    const roomAndUserInfo = await this.roomService.getRoomInfo(await room_id);
    if ((await roomAndUserInfo) !== false) {
      await this.nsp.to(title).emit("room-status-changed", roomAndUserInfo);
    }
    return { success: true };
  }
}
