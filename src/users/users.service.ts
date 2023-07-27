import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Auth } from 'src/auth/schemas/auth.schema';

// This should be a real class/interface representing a user entity
export type User = any;

@Injectable()
export class UsersService {
    validateUser(payload: any) {
        throw new Error('Method not implemented.');
    }
    constructor(
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
      ) {}

    async userInfoFromEmail(email : string) : Promise<any>  {
        const user = await this.authModel.findOne({email : email});
        return user._id;
    }
    async getUserInfo(email: string){
        const userInfo = await this.authModel.findOne({email : email});
        if (userInfo) {
          throw new BadRequestException('해당 유저를 찾을 수 없습니다!');
        }
        return userInfo;
      }
      
}