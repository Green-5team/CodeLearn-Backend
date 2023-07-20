import { BadRequestException, Injectable } from '@nestjs/common';
import { RoomCreateDto } from './dto/room.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Room } from './schemas/room.schema'
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/schemas/user.schema';

@Injectable()
export class RoomService {
    constructor(@InjectModel(Room.name) private roomModel: Model<Room>) {}
    
    async createRoom(room : RoomCreateDto, user: User) : Promise<Room> {
        let newRoom;
        const userid = user._id;
        
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
        console.log(userid)
        return newRoom.save()
    }
}
