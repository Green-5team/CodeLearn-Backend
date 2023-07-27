import { IsEmail } from 'class-validator';
import { RoomAndUser } from './schemas/roomanduser.schema';
import { BadRequestException, Injectable } from '@nestjs/common';
import { RoomCreateDto, RoomAndUserDto, EmptyOrLock, UserInfoDto, RoomStatusChangeDto } from './dto/room.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Room } from './schemas/room.schema'
import mongoose, { Model,Mongoose,ObjectId,ObjectIdSchemaDefinition,Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { Auth } from 'src/auth/schemas/auth.schema';

@Injectable()
export class RoomService {
    getResult(room_id: mongoose.Schema.Types.ObjectId, index: number) {
        throw new Error('Method not implemented.');
    }
    constructor(
        private readonly userService: UsersService,
        @InjectModel(Room.name) private readonly roomModel: Model<Room>,
        @InjectModel(RoomAndUser.name) private readonly roomAndUserModel: Model<RoomAndUser>,
        @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    ) {}
    
    async createRoom(room :RoomCreateDto, email : string) : Promise<Room> {
        let newRoom;
        const found = await this.roomModel.findOne({title : room.title});
        if(found){
            throw new BadRequestException('Duplicate room title! please enter new title');
        }
        if(room.status == "PRIVATE"){
            const hashedPassword = await bcrypt.hash(room.password, 10);
            newRoom = new this.roomModel({...room, password : hashedPassword});
        }
        else{
            newRoom = new this.roomModel({...room});
        }
        const user = await this.authModel.findOne({email: email}).exec();

        // 방 만들땐, 방장의 id 와 나머지는 널 값으러 채워야함. 
        const roomAndUserDto = new RoomAndUserDto();
        roomAndUserDto.room_id = newRoom._id;

        const max_member_number = room.max_members;

        const infoArray = Array.from({length : 10}, (_,index) => {
            if (index === 0) return user._id.toString();
            if (index < max_member_number) return EmptyOrLock.EMPTY;
            else return EmptyOrLock.LOCK;
        })

        console.log("create and after room status : ", infoArray);

        roomAndUserDto.user_info = infoArray;

        const readyStatusArray = Array.from({length : 10}, (_,index) => {
            if (index < 10) return false;
        })

        const ownerArray = Array.from({length : 10}, (_,index) => {
            if (index === 0) return true;
            if (index < 10) return false;
        })

        roomAndUserDto.ready_status = readyStatusArray;
        roomAndUserDto.owner = ownerArray;
        await this.saveRoomAndUser(roomAndUserDto);

        return newRoom.save();
    }

    async saveRoomAndUser(info : RoomAndUserDto) : Promise <void> {
        const newInfoForRoom = new this.roomAndUserModel({...info});
        await newInfoForRoom.save();
    }

    async getRoomList() : Promise<Room[]> {
        const rooms = await this.roomModel.find().exec();
        const result = await rooms.filter(room => room.ready === true);
        return result;
    }
    
    async getRoomIdFromTitle(title : string) : Promise<ObjectId> {
        const room = await this.roomModel.findOne({title: title}).exec();
    if (!room) {
        throw new Error(`No room found with title: ${title}`);
    }
    return room._id;
}

    async getTitleFromRoomId(roomID : ObjectId) : Promise<string> {
        const roomInfo = await this.roomModel.findOne({_id: roomID}).exec();
        if(!!roomInfo) {
            return roomInfo.title;
        }
        return null;
    }

    async checkRoomCondition(title_name : string) : Promise<boolean> {
        const room = await this.roomModel.findOne({title : title_name}).exec();
        if (room && room.member_count < room.max_members && room.ready === true){
            return true;
        }
        return false;
    }

    async memberCountUp(room_id : ObjectId) : Promise<void> {
        const room = await this.roomModel.findOneAndUpdate({_id :room_id}, { $inc: { member_count: 1 }},  { new: true } );
        if(room.member_count === room.max_members){
            await this.roomModel.findOneAndUpdate({_id :room_id}, {ready : false});
        }
    }

    async memberCountDown(room_id : ObjectId) : Promise<{success : boolean}> {
        const room = await this.roomModel.findOneAndUpdate({_id :room_id}, { $inc: { member_count: -1 }},  { new: true } );
        if (!room) {
            throw new Error(`No room found for id ${room_id}`);
        }
        if(room.member_count === 0 ){
            await this.roomAndUserModel.deleteOne({room_id :room_id});
            await this.roomModel.findOneAndUpdate({_id :room_id}, {ready : false});
        }
        return {success : true};
    }

    async changeRoomStatusForJoin(room_id : ObjectId, user_id : ObjectId) : Promise<void> {

        // 해당 방에 대한 정보를 얻음
        const roomAndUserInfo = await this.roomAndUserModel.findOne({room_id : room_id}).exec();

        if (!roomAndUserInfo) {
            // Handle the case where roomanduser is undefined
            throw new Error(`No RoomAndUser found for room id ${room_id}`);
        }
        
        // 방 정보에서 첫번째로 empty인 부분을 찾음
        const empty_index = roomAndUserInfo.user_info.indexOf("EMPTY");

        await this.roomAndUserModel.findOneAndUpdate(
            { room_id: room_id },
            { $set: { 
                [`user_info.${empty_index}`]:  user_id.toString(),
                [`ready_status.${empty_index}`]:  false
            }  },
        )
        await this.memberCountUp(room_id);
    }

    async getRoomInfo(room_id : ObjectId) : Promise<RoomStatusChangeDto | boolean> {
        // room 의 변경사항이 생겼을 때, 사용할 dto 
        const roomStatusChangeDto = new RoomStatusChangeDto;

        const room = await this.roomModel.findOne({_id : room_id}).exec();
        const roomanduser = await this.roomAndUserModel.findOne({room_id : room_id}).exec();

        if (!roomanduser) {
        // Handle the case where roomanduser is undefined
            return false;
        }

        const userInfo = await Promise.all(
            roomanduser.user_info.map(async (userID, index) => {

              if (userID === "EMPTY" || userID === "LOCK") {
                return userID as EmptyOrLock;
              } else {
                const user = await this.authModel.findOne({_id : userID});
                
                const userInfoDto = new UserInfoDto;

                userInfoDto.nickname = user.nickname;
                userInfoDto.level = user.level;
                userInfoDto.status = roomanduser.ready_status[index];
                userInfoDto.owner = roomanduser.owner[index];

                return userInfoDto;
              }
            })
          );

        roomStatusChangeDto.title = room.title;
        roomStatusChangeDto.member_count = room.member_count;
        roomStatusChangeDto.user_info = userInfo;

        return roomStatusChangeDto;
    }

    async changeRoomStatusForLeave (room_id : ObjectId, user_id : ObjectId) : Promise<string> {
        // 디비에 해당 유저를 empty 로 바꾸고
        // 방 인원수도 바꿔줌.
         // 해당 방에 대한 정보를 얻음
         const roomAndUserInfo = await this.roomAndUserModel.findOne({room_id : room_id}).exec();

         if (!roomAndUserInfo) {
             // Handle the case where roomanduser is undefined
             return `No RoomAndUser found for room id ${room_id}`;
         }
         
         // 방 정보에서 첫번째로 empty인 부분을 찾음
         if (!user_id) {
            // Handle the case where user_id is undefined
            return 'user_id is undefined';
        }

        const user_index = await roomAndUserInfo.user_info.indexOf(user_id.toString());
        await this.roomAndUserModel.findOneAndUpdate(
             { room_id : room_id },
             { $set: { 
                 [`user_info.${user_index}`]:  "EMPTY",
                 [`ready_status.${user_index}`]:  false
             }  },
         )
         await this.memberCountDown(room_id);
         return 'Success';
    }

    async checkWrongDisconnection (email : string) : Promise<boolean> {

        const user = await this.authModel.findOne({email : email});
        if(await user.online === true){
            return false;
        }else {
            return true;
        }
    }

    async changeOwner(room_id : ObjectId,user_id : ObjectId, index : number) : Promise<boolean> {
        const roomAndUserInfo = await this.roomAndUserModel.findOne({room_id : room_id}).exec();
        const current_index = await roomAndUserInfo.user_info.indexOf(user_id.toString());

        if (current_index === -1) {
            throw new Error(`User with id ${user_id} not found in room ${room_id}`);
        }
        
        await this.roomAndUserModel.findOneAndUpdate(
            { room_id : room_id }, 
            { $set : {
                [`owner.${current_index}`] : false }
            }
        )
        const result = await this.roomAndUserModel.findOneAndUpdate(
            { room_id : room_id }, 
            { $set : {
                [`owner.${index}`] : true }
            }
        )
        return true;
    }


    async setUserStatusToReady(room_id: ObjectId, user_id: ObjectId): Promise<{ nickname: string, status: boolean }> {
        const roomAndUser = await this.roomAndUserModel.findOne({ room_id: room_id }).exec();
        const userIndex = roomAndUser.user_info.findIndex((uid) => uid === user_id.toString());
        const user = await this.authModel.findOne({ _id: user_id });
    
        roomAndUser.ready_status[userIndex] = roomAndUser.ready_status[userIndex] ? false : true;
        await roomAndUser.save();
        return { nickname: user.nickname, status: roomAndUser.ready_status[userIndex] };
    }

    async findRoomForQuickJoin(email: string): Promise<string | null> {
        const user_id = await this.userService.userInfoFromEmail(email);
        const roomAndUser = await this.roomAndUserModel.findOne({
            user_info: "EMPTY"
        }).exec();
        
        if (roomAndUser) {
            return roomAndUser.room_id.toString();
        } else {
            return null;
        }
    }

    async isUserInRoom(room_id : ObjectId, user_id : ObjectId) : Promise<boolean> {
    const roomAndUser = await this.roomAndUserModel.findOne({room_id : room_id}).exec();
    if (roomAndUser) {
        return roomAndUser.user_info.includes(user_id.toString());
    }
    return false;
    }
    async getRoomById(room_id: string): Promise<Room> {
        const room = await this.roomModel.findById(room_id).exec();
 
        return room;
    }  
}
