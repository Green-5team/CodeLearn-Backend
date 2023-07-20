export interface Room {
  id: string;
  title: string;
  member_count: number;
  max_members: number;
  status: RoomStatus;
  password: string;
  level: number;
  mode: RoomMode;
  create_time: Date;
}

export enum RoomStatus {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  READY = "READY",
}

export enum RoomMode {
  STUDY = "STUDY",
  COOPERATIVE = "COOPERATIVE",
}
