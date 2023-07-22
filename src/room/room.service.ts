import { RoomAndUser } from "./schemas/roomanduser.schema";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  RoomCreateDto,
  RoomAndUserDto,
  EmptyOrLock,
  UserInfoDto,
  RoomStatusChangeDto,
} from "./dto/room.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Room } from "./schemas/room.schema";
import mongoose, {
  Model,
  ObjectId,
  ObjectIdSchemaDefinition,
  Types,
} from "mongoose";
import * as bcrypt from "bcrypt";
import { UsersService } from "src/users/users.service";
import { Auth } from "src/auth/schemas/auth.schema";
@Injectable()
export class RoomService {
  chageRoomStatus(room_id: mongoose.Schema.Types.ObjectId) {
    throw new Error("Method not implemented.");
  }
  constructor(
    private readonly userService: UsersService,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    @InjectModel(RoomAndUser.name)
    private readonly roomAndUserModel: Model<RoomAndUser>,
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>
  ) {}

  async createRoom(
    room: RoomCreateDto,
    email: string,
    socket_id: string
  ): Promise<Room> {
    let newRoom;
    const found = await this.roomModel.findOne({ title: room.title });
    if (found) {
      throw new BadRequestException(
        "Duplicate room title! please enter new title"
      );
    }
    if (room.status == "PRIVATE") {
      const hashedPassword = await bcrypt.hash(room.password, 10);
      newRoom = new this.roomModel({
        ...room,
        password: hashedPassword,
        socket_id: socket_id,
      });
    } else {
      newRoom = new this.roomModel({ ...room, socket_id: socket_id });
    }
    const user = await this.authModel.findOne({ email: email }).exec();

    // 방 만들땐, 방장의 id 와 나머지는 널 값으러 채워야함.
    const roomAndUserDto = new RoomAndUserDto();
    roomAndUserDto.room_id = newRoom._id;

    const max_member_number = room.max_members;

    const infoArray = Array.from({ length: 10 }, (_, index) => {
      if (index === 0) return user._id.toString();
      if (index < max_member_number) return EmptyOrLock.EMPTY;
      else return EmptyOrLock.LOCK;
    });

    console.log("create room dunction : ", infoArray);

    roomAndUserDto.user_info = infoArray;
    roomAndUserDto.ready_status = []; // 배열 초기화
    roomAndUserDto.ready_status[0] = false;

    await this.saveRoomAndUser(roomAndUserDto);

    return newRoom.save();
  }

  async saveRoomAndUser(info: RoomAndUserDto): Promise<void> {
    const newInfoForRoom = new this.roomAndUserModel({ ...info });
    await newInfoForRoom.save();
  }

  async getRoomList(req): Promise<Room[]> {
    const rooms = await this.roomModel.find().exec();
    const result = rooms.filter((room) => room.ready === true);
    return result;
  }

  async getRoomIdFromTitle(title: string): Promise<ObjectId> {
    const room = await this.roomModel.findOne({ title: title }).exec();
    return room._id;
  }
  async getSocketId(room_id: ObjectId): Promise<string> {
    const roominfo = await this.roomModel.findOne({ _id: room_id }).exec();
    const socket_id = roominfo.socket_id;
    return socket_id;
  }

  async checkRoomCondition(title_name: string): Promise<boolean> {
    console.log(title_name);
    const room = await this.roomModel.findOne({ title: title_name }).exec();
    console.log(room);
    if (room && room.member_count < room.max_members && room.ready === true) {
      return true;
    }
    return false;
  }

  async memberCountUp(room_id: ObjectId): Promise<void> {
    const room = await this.roomModel.findOneAndUpdate(
      { _id: room_id },
      { $inc: { member_count: 1 } },
      { new: true }
    );
    if (room.member_count === room.max_members) {
      await this.roomModel.updateOne({ _id: room_id }, { status: false });
    }
  }

  async changeRoomStatusForJoin(
    room_id: ObjectId,
    user_id: ObjectId
  ): Promise<void> {
    console.log("join", user_id);
    const room = await this.roomModel.findById(room_id);
    room.member_count += 1;

    if (room.member_count === room.max_members) {
      room.ready = false;
    }
    // 방에 들어가려는 유저의 정보를 찾음
    const user = await this.authModel.findOne({ _id: user_id }).exec();

    // 해당 방에 대한 정보를 얻음
    const roomAndUserInfo = await this.roomAndUserModel
      .findOne({ room_id: room_id })
      .exec();

    if (!roomAndUserInfo) {
      // Handle the case where roomanduser is undefined
      throw new Error(`No RoomAndUser found for room id ${room_id}`);
    }

    // 방 정보에서 첫번째로 empty인 부분을 찾음
    const empty_index = roomAndUserInfo.user_info.indexOf("EMPTY");

    await this.roomAndUserModel.updateOne(
      { room_id: room_id },
      {
        $set: {
          [`user_info.${empty_index}`]: user_id.toString(),
          [`ready_status.${empty_index}`]: false,
        },
      }
    );

    await this.memberCountUp(room_id);
  }

  async getRoomInfo(room_id: ObjectId): Promise<RoomStatusChangeDto> {
    // room 의 변경사항이 생겼을 때, 사용할 dto
    const roomStatusChangeDto = new RoomStatusChangeDto();

    const room = await this.roomModel.findOne({ _id: room_id }).exec();
    const roomanduser = await this.roomAndUserModel
      .findOne({ room_id: room_id })
      .exec();

    if (!roomanduser) {
      // Handle the case where roomanduser is undefined
      throw new Error(`No RoomAndUser found for room id ${room_id}`);
    }

    const userInfo = await Promise.all(
      roomanduser.user_info.map(async (userID, index) => {
        console.log("userID : ", userID);

        if (userID === "EMPTY" || userID === "LOCK") {
          return userID as EmptyOrLock;
        } else {
          const user = await this.authModel.findOne({ _id: userID });

          const userInfoDto = new UserInfoDto();

          userInfoDto.nickname = user.nickname;
          userInfoDto.level = user.level;
          userInfoDto.status = roomanduser.ready_status[index];

          return userInfoDto;
        }
      })
    );

    roomStatusChangeDto.title = room.title;
    roomStatusChangeDto.member_count = room.member_count;
    roomStatusChangeDto.user_info = userInfo;

    return roomStatusChangeDto;
  }
}
