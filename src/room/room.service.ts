import { IsEmail } from 'class-validator';
import { RoomAndUser } from './schemas/roomanduser.schema';
import { BadRequestException, Injectable } from '@nestjs/common';
import { RoomCreateDto, RoomAndUserDto, EmptyOrLock, UserInfoDto, RoomStatusChangeDto, Page } from './dto/room.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Room } from './schemas/room.schema'
import mongoose, { Model,Mongoose,ObjectId,ObjectIdSchemaDefinition,Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { Auth } from 'src/auth/schemas/auth.schema';
@Injectable()
export class RoomService {
    constructor(
        private readonly userService: UsersService,
        @InjectModel(Room.name) private readonly roomModel: Model<Room>,
        @InjectModel(RoomAndUser.name) private readonly roomAndUserModel: Model<RoomAndUser>,
        @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    ) {}
    
    async createRoom(room :RoomCreateDto, email : string) : Promise<Room> {
        let newRoom;
        const found = await this.roomModel.findOne({ title: room.title });
        
        if(found && found.ready === true){
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

        roomAndUserDto.user_info = infoArray;

        const AllFalseStatusArray = Array.from({length : 10}, (_,index) => {
            if (index < 10) return false;
        })

        const ownerArray = Array.from({length : 10}, (_,index) => {
            if (index === 0) return true;
            if (index < 10) return false;
        })

        roomAndUserDto.ready_status = AllFalseStatusArray;
        roomAndUserDto.owner = ownerArray;
        roomAndUserDto.solved = AllFalseStatusArray; 
        roomAndUserDto.review = AllFalseStatusArray;
        await this.saveRoomAndUser(roomAndUserDto);

        return newRoom.save();
    }

    async saveRoomAndUser(info : RoomAndUserDto) : Promise <void> {
        const newInfoForRoom = new this.roomAndUserModel({...info});
        await newInfoForRoom.save();
    }

    async getRoomList(page: number): Promise<Page<Room[]>> {
        const pageSize = 8;
        const totalCount = await this.roomModel.countDocuments({ready: true});
        const totalPage = Math.ceil(totalCount / pageSize);
        const rooms = await this.roomModel.find({ready: true})
            .sort('-createdAt')
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .exec();
        return {
            pageSize,
            totalCount,
            totalPage,
            rooms: rooms,
            
        };
    }
    
    async getRoomIdFromTitle(title : string) : Promise<ObjectId> {
        const room = await this.roomModel.findOne({title: title}).exec();
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
                userInfoDto.solved = roomanduser.solved[index];
                userInfoDto.review = roomanduser.review[index];
                return userInfoDto;
              }
            })
          );

        roomStatusChangeDto.title = room.title;
        roomStatusChangeDto.member_count = room.member_count;
        roomStatusChangeDto.max_members = room.max_members;
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

    async getResult(room_id: ObjectId, index : number) {
        
        const roomInfo = await this.roomAndUserModel.findOne({ room_id: room_id }).exec();
        console.log(roomInfo);
        
        roomInfo.review[index] = true;
        try {
            await roomInfo.save();
        } catch {
            return false;
        }
        return true;
    }
    
 
    
    async unlockRoom(room_id: ObjectId, index: number): Promise<{roomAndUser: RoomAndUserDto, title: string, maxMembers:number} | null> {
        
        const roomAndUser = await this.roomAndUserModel.findOne({room_id: room_id}).exec();
        
        if (!roomAndUser || !roomAndUser.owner[0]) {
            throw new BadRequestException('권한이 있는 유저인지 확인');
        }
    
        if(index < 0 || index >= roomAndUser.user_info.length){
            console.log('Index out of bounds');
            return null;
        }
        
        let increment = 0;  //증가하는 값을 설정해주고      
        if(roomAndUser.user_info[index] === EmptyOrLock.LOCK){
            roomAndUser.user_info[index] = EmptyOrLock.EMPTY;
            increment = 1; //lock->unlock은 증가하는 값을 1로   
        } else if (roomAndUser.user_info[index] === EmptyOrLock.EMPTY) {
            roomAndUser.user_info[index] = EmptyOrLock.LOCK;
            increment = -1; //unlock->lock은 증가하는 값을 -1
        } else {
            return null;
        }
    
        await roomAndUser.save();
    
        const room = await this.roomModel.findOne({ _id: room_id }, 'title max_members').exec(); //확인해본 결과 이렇게 했을 경우에 title max_members로 mongodb에서 title과 max_members값만 추출할 수 있습니다.
                
        if (room) {
            room.max_members += increment; //증가하는 값만큼을 더 해주는 방식으로 max_members를 조절함
            await room.save();
        }
        const roomTitle = room ? room.title : '';
        const maxMembers = room ? room.max_members : 0;
        return { roomAndUser: roomAndUser, title: roomTitle, maxMembers: maxMembers };
        }
    }
