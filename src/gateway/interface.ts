import { ObjectId } from "mongoose";
import { Socket } from "socket.io";
import { RoomStatusChangeDto } from "src/room/dto/room.dto";

export interface ExtendedSocket extends Socket {
    decoded : {email :string},
    user_id : ObjectId,
    nickname : String,
    room_id : ObjectId
}

export interface CodeSubmission {
    script: string;
    language: string;
    versionIndex: number;
    problemNumber: number;
    title: string;
}

export interface JoinRoomPayload {
  title: string;
  password?: string; // 옵셔널 필드
}

export interface ResponsePayload {
  success: boolean;
  payload: {
    roomInfo?: RoomStatusChangeDto | boolean;
    message?: string; 
  };
}