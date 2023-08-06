import { IsEmail } from 'class-validator';
import { RoomAndUser } from './schemas/roomanduser.schema';
import { BadRequestException, Injectable } from '@nestjs/common';
import { RoomCreateDto, RoomAndUserDto, EmptyOrLock, UserInfoDto, RoomStatusChangeDto, Team } from './dto/room.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Room } from './schemas/room.schema'
import mongoose, { Model,Mongoose,ObjectId,ObjectIdSchemaDefinition,Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { Auth } from 'src/auth/schemas/auth.schema';
import { constrainedMemory } from 'process';
@Injectable()
export class RoomService {
    constructor(
        private readonly userService: UsersService,
        @InjectModel(Room.name) private readonly roomModel: Model<Room>,
        @InjectModel(RoomAndUser.name) private readonly roomAndUserModel: Model<RoomAndUser>,
        @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    ) { }
    
    async duplicationCheck(title: string): Promise<Boolean> {
        const check = await this.roomAndUserModel.findOne({ title: title }).exec();
        if (check) {
            return false;
        }
        return true;
    }

    async createRoom(room: RoomCreateDto, email: string, userId: ObjectId): Promise<Room> {
        let newRoom;
        const found = await this.roomModel.findOne({ title: room.title });
        
        if (room.status == "PRIVATE") {
            const hashedPassword = await bcrypt.hash(room.password, 10);
            newRoom = new this.roomModel({ ...room, password: hashedPassword });
        }
        else {
            newRoom = new this.roomModel({ ...room });
        }

        // 방 만들땐, 방장의 id 와 나머지는 널 값으러 채워야함. 
        const roomAndUserDto = new RoomAndUserDto();
        roomAndUserDto.title = room.title;
        roomAndUserDto.room_id = newRoom._id;
        const max_member_number = room.max_members;
        roomAndUserDto.mode = room.mode;

        let infoArray;
        if (room.mode === "COOPERATIVE") {
            const redTeamSize = Math.ceil(max_member_number / 2);
            const blueTeamSize = Math.floor(max_member_number / 2);

            infoArray = Array.from({ length: 10 }, (_, index) => {
                if (index === 0) return userId.toString();
                if (index < redTeamSize) return EmptyOrLock.EMPTY;
                if (5 <= index && index < (5 + blueTeamSize)) return EmptyOrLock.EMPTY;
                else return EmptyOrLock.LOCK;
            })
        } else {
            infoArray = Array.from({ length: 10 }, (_, index) => {
                if (index === 0) return userId.toString();
                if (index < max_member_number) return EmptyOrLock.EMPTY;
                else return EmptyOrLock.LOCK;
            })
        }
        roomAndUserDto.user_info = infoArray;
        const AllFalseStatusArray = Array.from({ length: 10 }, (_, index) => {
            if (index < 10) return false;
        })
        const ownerArray = Array.from({ length: 10 }, (_, index) => {
            if (index === 0) return true;
            if (index < 10) return false;
        })
        roomAndUserDto.ready_status = AllFalseStatusArray;
        roomAndUserDto.owner = ownerArray;
        roomAndUserDto.submit = AllFalseStatusArray;
        roomAndUserDto.solved = AllFalseStatusArray;
        roomAndUserDto.review = AllFalseStatusArray;

        let teamArray;
        if (room.mode === "COOPERATIVE") {
            teamArray = Array.from({ length: 10 }, (_, index) => {
                if (index < 5) return Team.RED;
                else return Team.BLUE;
            })
        } else {
            teamArray = Array.from({ length: 10 }, (_, index) => {
                if (index < 10) return null;
            })
        }
        roomAndUserDto.team = teamArray;
        await this.saveRoomAndUser(roomAndUserDto);
        return newRoom.save();
    }

    async saveRoomAndUser(info: RoomAndUserDto): Promise<void> {
        const newInfoForRoom = new this.roomAndUserModel({ ...info });
        await newInfoForRoom.save();
    }

    async getRoomList(page: number, level?: number): Promise<any> {
        const pageSize = 6;
        const totalCount = await this.roomModel.countDocuments({ ready: true });
        let totalPage = Math.ceil(totalCount / pageSize);
        totalPage = totalPage > 0 ? totalPage : 1;

        if (page > totalPage) {
            page = totalPage;
        }

        let roomsDocuments;
        if (level !== undefined) {
            roomsDocuments = await this.roomModel.find({ ready: true, level: level })
                .sort('-createdAt')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .exec();
        } else {
            console.log("level is undefined");
            roomsDocuments = await this.roomModel.find({ ready: true })
                .sort('-createdAt')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .exec();
        }
        
        const roomListDto = roomsDocuments.map((room) => {
            return {
                title: room.title,
                member_count: room.member_count,
                max_members: room.max_members,
                status: room.status,
                level: room.level,
                mode: room.mode,
            };
        });
        return {
            rooms: roomListDto,
            totalPage
        };
    }
    
    async getRoomIdFromTitle(title: string): Promise<ObjectId | null> {
        const room = await this.roomModel.findOne({ title: title }).exec();
        
        return room._id;
    }

    async getTitleFromRoomId(roomID: ObjectId): Promise<string> {
        const roomInfo = await this.roomModel.findOne({ _id: roomID }).exec();
        if (!!roomInfo) {
            return roomInfo.title;
        }
        return null;
    }

    async checkRoomCondition(title_name: string): Promise<boolean> {
        const room = await this.roomModel.findOne({ title: title_name }).exec();
        if (room && room.member_count < room.max_members && room.ready === true) {
            return true;
        }
        return false;
    }

    async memberCountUp(room_id: ObjectId): Promise<void> {
        const room = await this.roomModel.findOneAndUpdate({ _id: room_id }, { $inc: { member_count: 1 } }, { new: true });
        if (room.member_count === room.max_members) {
            await this.roomModel.findOneAndUpdate({ _id: room_id }, { ready: false });
        }
    }

    async memberCountDown(room_id: ObjectId): Promise<{ success: boolean }> {
        const room = await this.roomModel.findOneAndUpdate({ _id: room_id }, { $inc: { member_count: -1 } }, { new: true });
        if (room.ready === false) {
            if (room.member_count < room.max_members) {
                room.ready = true;
            }
        }
        room.save();
        
        if (!room) {
            throw new Error(`No room found for id ${room_id}`);
        }
        if (room.member_count === 0) {
            await this.roomAndUserModel.deleteOne({ room_id: room_id });
            await this.roomModel.findOneAndUpdate({ _id: room_id }, { ready: false });
        }
        return { success: true };
    }

    async changeRoomStatusForJoin(room_id: ObjectId, user_id: ObjectId): Promise<void> {

        // 해당 방에 대한 정보를 얻음
        const roomAndUserInfo = await this.roomAndUserModel.findOne({ room_id: room_id }).exec();

        if (!roomAndUserInfo) {
            // Handle the case where roomanduser is undefined
            throw new Error(`No RoomAndUser found for room id ${room_id}`);
        }

        let empty_index;

        if (roomAndUserInfo.mode === "COOPERATIVE") {
            const userInfo = roomAndUserInfo.user_info;
            const redTeam = userInfo.slice(0, 5);
            const blueTeam = userInfo.slice(5, 10);

            const redEmptyIndex = redTeam.filter(x => x === "EMPTY").length;
            const blueEmptyIndex = blueTeam.filter(x => x === "EMPTY").length;

            const redLockIndex = redTeam.filter(x => x === "LOCK").length;
            const blueLockIndex = blueTeam.filter(x => x === "LOCK").length;

            const redPeople = 5 - redLockIndex;
            const bluePeople = 5 - blueLockIndex;

            if (redPeople - redEmptyIndex > bluePeople - blueEmptyIndex) {
                empty_index = blueTeam.indexOf("EMPTY");
                empty_index += 5;
            } else {
                empty_index = redTeam.indexOf("EMPTY");
            }
        } else {
            empty_index = roomAndUserInfo.user_info.indexOf("EMPTY");
        }

        await this.roomAndUserModel.findOneAndUpdate(
            { room_id: room_id },
            {
                $set: {
                    [`user_info.${empty_index}`]: user_id.toString(),
                    [`ready_status.${empty_index}`]: false
                }
            },
        )
        await this.memberCountUp(room_id);
    }

    async getRoomInfo(room_id: ObjectId): Promise<RoomStatusChangeDto | boolean> {
        // room 의 변경사항이 생겼을 때, 사용할 dto 
        const roomStatusChangeDto = new RoomStatusChangeDto;
        const room = await this.roomModel.findOne({ _id: room_id }).exec();
        const roomanduser = await this.roomAndUserModel.findOne({ room_id: room_id }).exec();

        if (!roomanduser) {
            // Handle the case where roomanduser is undefined
            return false;
        }

        const userInfo = await Promise.all(
            roomanduser.user_info.map(async (userID, index) => {

                if (userID === "EMPTY" || userID === "LOCK") {
                    return userID as EmptyOrLock;
                } else {
                    const user = await this.authModel.findOne({ _id: userID });
                
                    const userInfoDto = new UserInfoDto;

                    userInfoDto.nickname = user.nickname;
                    userInfoDto.level = user.level;
                    userInfoDto.status = roomanduser.ready_status[index];
                    userInfoDto.owner = roomanduser.owner[index];
                    userInfoDto.solved = roomanduser.solved[index];
                    userInfoDto.submit = roomanduser.submit[index];
                    userInfoDto.review = roomanduser.review[index];
                    userInfoDto.team = roomanduser.team[index];
                    return userInfoDto;
                }
            })
        );

        roomStatusChangeDto.title = room.title;
        roomStatusChangeDto.member_count = room.member_count;
        roomStatusChangeDto.max_members = room.max_members;
        roomStatusChangeDto.user_info = userInfo;
        roomStatusChangeDto.mode = room.mode;
        roomStatusChangeDto.problem_number = roomanduser.problem_number;

        return roomStatusChangeDto;
    }

    async changeRoomStatusForLeave(room_id: ObjectId, user_id: ObjectId): Promise<Boolean | string> {
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

    let updateData = {
        $set: { 
            [`user_info.${user_index}`]:  "EMPTY",
            [`ready_status.${user_index}`]:  false
        }
    };

    // Check if the user who left is the owner
    if (roomAndUserInfo.owner[user_index]) {
        // Find the index of the next owner
        let nextOwnerIndex = roomAndUserInfo.user_info.findIndex((value, index) => value !== "EMPTY" && value !== "LOCK" && index !== user_index);

        // If a user was found who can become the new owner
        if (nextOwnerIndex !== -1) {
            updateData.$set[`owner.${user_index}`] = false;
            updateData.$set[`owner.${nextOwnerIndex}`] = true;
            // If the new owner's ready_status is true, set it to false
            if (roomAndUserInfo.ready_status[nextOwnerIndex]) {
                updateData.$set[`ready_status.${nextOwnerIndex}`] = false;
            }
        }
    }

    await this.roomAndUserModel.findOneAndUpdate(
         { room_id : room_id },
         updateData
    );

    await this.memberCountDown(room_id);
    return true;
}







    
    
    
    
    
    

    async checkWrongDisconnection(email: string): Promise<boolean> {

        const user = await this.authModel.findOne({ email: email });
        if (await user.online === true) {
            return false;
        } else {
            return true;
        }
    }

    async changeOwner(room_id: ObjectId, user_id: ObjectId, index: number): Promise<boolean> {
        const roomAndUserInfo = await this.roomAndUserModel.findOne({ room_id: room_id }).exec();
        const current_index = await roomAndUserInfo.user_info.indexOf(user_id.toString());
    
        if (current_index === -1) {
            throw new Error(`User with id ${user_id} not found in room ${room_id}`);
        }
        
        await this.roomAndUserModel.findOneAndUpdate(
            { room_id: room_id },
            {
                $set: {
                    [`owner.${current_index}`]: false
                }
            }
        )
        const result = await this.roomAndUserModel.findOneAndUpdate(
            { room_id: room_id },
            {
                $set: {
                    [`owner.${index}`]: true,
                    [`ready_status.${index}`]: false
                } // set the ready status of the new owner to false
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

    async getResult(room_id: ObjectId, user_id: ObjectId) {
        
        const roomInfo = await this.roomAndUserModel.findOne({ room_id: room_id }).exec();
        let review_index = 0;

        await roomInfo.user_info.forEach(async (user, index) => {
            if (user === user_id.toString()) {
                review_index = index;
            }
        });
        
        if (review_index !== -1) {
            roomInfo.review[review_index] = !roomInfo.review[review_index];
            try {
                await roomInfo.save();
                return true;
            } catch {
                return false;
            }
        }
        return false;
    }
    
    
    async unlockRoom(room_id: ObjectId, index: number): Promise<boolean> {
        
        const roomAndUser = await this.roomAndUserModel.findOne({ room_id: room_id }).exec();
        
        if (!roomAndUser || !roomAndUser.owner[0]) {
            throw new BadRequestException('권한이 있는 유저인지 확인');
        }
    
        if (index < 0 || index >= roomAndUser.user_info.length) {
            console.log('Index out of bounds');
            return null;
        }
        
        let increment = 0;
        if (roomAndUser.user_info[index] === EmptyOrLock.LOCK) {
            roomAndUser.user_info[index] = EmptyOrLock.EMPTY;
            increment = 1;
        } else if (roomAndUser.user_info[index] === EmptyOrLock.EMPTY) {
            roomAndUser.user_info[index] = EmptyOrLock.LOCK;
            increment = -1;
        } else {
            return false;
        }
    
        await roomAndUser.save();
        const room = await this.roomModel.findOne({ _id: room_id }, 'title max_members').exec();
  
        if (room) {
            room.max_members += increment;
            await room.save();
        }
        return true;
    }
    
    async getResultList(title: string): Promise<RoomStatusChangeDto | boolean> {
        const roomList = await this.roomModel.findOne({ title: title }).exec();
        return this.getRoomInfo(roomList._id);
    }

    async findRoomForQuickJoin(): Promise<{ title: string, room_id: string } | null> {
        
        const readyRoom = await this.roomModel.find({ ready: true }).exec();
        
        const roomAndUser = await readyRoom.map(async (room) => {
            const check = await this.roomAndUserModel.findOne({ room_id: room._id, user_info: "EMPTY" }).exec();
            if (check) {
                return {
                    title: room.title,
                    room_id: room._id.toString()
                }
            }
        });
        const randomIndex = Math.floor(Math.random() * roomAndUser.length);
        return roomAndUser[randomIndex];
    }

    async isUserInRoom(room_id: ObjectId, user_id: ObjectId): Promise<boolean> {
        const roomAndUser = await this.roomAndUserModel.findOne({ room_id: room_id }).exec();
        if (roomAndUser) {
            return roomAndUser.user_info.includes(user_id.toString());
        }
        return false;
    
    }
    async getRoomById(room_id: ObjectId): Promise<Room> {
        const room = await this.roomModel.findById(room_id).exec();
 
        return room;
    }
        
    async checkRoomPassword(title: string, password: string): Promise<boolean> {
        const roomInfo = this.roomModel.findOne({ title: title }).exec();
        if ((await roomInfo).status === "PUBLIC") {
            return true;
        }
        if (password === undefined) {
            return false;
        }
        const isPasswordMatched = await bcrypt.compare(password, (await roomInfo).password);
        if (isPasswordMatched) {
            return true;
        }
        return false;
    }

    async getNickNameltList(title: string): Promise<string[]> {
        let nickNameList: string[] = [];

        const roomAndUserList = await this.roomAndUserModel.find({ title: title }, 'user_info').exec();

        for (const roomAndUser of roomAndUserList) {
            for (const user_id of roomAndUser.user_info) {
                if (user_id !== EmptyOrLock.EMPTY && user_id !== EmptyOrLock.LOCK) {
                    const user = await this.authModel.findOne({ _id: user_id }, 'nickname').exec();
                    nickNameList.push(user.nickname);
                }
            }
        }
        return nickNameList;
    }

    async getUserIdFromIndex(title: string, index: number): Promise<any> {
        const userInfo = await this.roomAndUserModel.findOne({ title: title }, 'user_info').exec();
        return new Types.ObjectId(userInfo.user_info[index]);
    }

    async checkReviewOrNot(title: string) {
        const roomInfo = await this.roomAndUserModel.findOne({ title: title }).exec();
        const reviews = (await roomInfo).review;
        return reviews.some((review) => review === true);
    }

    async checkBalanceTeam(roomId: ObjectId) {
        const roomInfo = await this.roomAndUserModel.findOne({ room_id: roomId }).exec();
        let red = 0;
        let blue = 0;
        roomInfo.user_info.forEach((user, index) => {
            if (index < 5) {
                if (user !== EmptyOrLock.EMPTY && user !== EmptyOrLock.LOCK) {
                    red += 1;
                }
            } else {
                if (user !== EmptyOrLock.EMPTY && user !== EmptyOrLock.LOCK) {
                    blue += 1;
                }
            }
        });
        if (red === blue) {
            return true;
        }
        return false;
    }

    async resetUserStatus(roomId: ObjectId) {

        const roomInfo = await this.roomAndUserModel.findOne({ room_id: roomId }).exec();
        if (!roomInfo) {
            return false;
        }
        const AllFalseStatusArray = Array.from({ length: 10 }, (_, index) => {
            if (index < 10) return false;
        });

        const result = await this.roomAndUserModel.findOneAndUpdate(
            { room_id: roomId },
            {
            $set: {
                solved: AllFalseStatusArray,
                submit: AllFalseStatusArray,
                review: AllFalseStatusArray,
                ready_status: AllFalseStatusArray,
            },
            }
        );
    return true;
    }
}


