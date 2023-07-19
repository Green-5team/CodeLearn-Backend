import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectModel } from '@nestjs/mongoose';
  import * as mongoose from 'mongoose';
  
  import { Query } from 'express-serve-static-core';
  import { User } from 'src/user/schemas/user.schema';
  import { RequestFriendDto, AcceptFriendDto, RejectFriendDto, DeleteFriendDto } from "./dto"
  
  @Injectable()
  export class FriendService {
    constructor(
      @InjectModel(User.name)
      private userModel: mongoose.Model<User>,
    ) {}
  
    // async findAll(query: Query): Promise<User[]> {
  
    //   const friends = await this.friendModel.find()
      
    //   return friends;
    // }
  
    // getAll() {
    //   return this.friendModel.find();
    // }
  
    async requestFriend(requestfriendDto: RequestFriendDto, user: User) {
      const { email } = requestfriendDto;
  
      const res = await this.userModel.updateOne({ email: email }, { $push: { friendrequest: user.email }})
      return res;
    }
  
    async acceptFriend(acceptfriendDto: AcceptFriendDto, user: User) {
      const { email } = acceptfriendDto;
      const mymail = user.email;
      await this.userModel.updateOne({ email: mymail }, { $pull: { friendrequest: email }})
      
      await this.userModel.updateOne({ email: mymail }, { $push: { friend: email }})
      await this.userModel.updateOne({ email: email }, { $push: { friend: mymail }})
      return {msg:`${email} has added to friend`};
    }
  
    async rejectFriend(rejectfriendDto: RejectFriendDto, user: User){
      const { email } = rejectfriendDto;
      const mymail = user.email;
      await this.userModel.updateOne({ email: mymail }, { $pull: { friendrequest: email }})
      return {msg:`Friend request from ${email} has rejected`};
    }

    async deleteFriend(deletefriendDto: DeleteFriendDto, user: User) {
      const { email } = deletefriendDto;
      const mymail = user.email;
      await this.userModel.updateOne({ email: mymail }, { $pull: { friend: email }})
      await this.userModel.updateOne({ email: email }, { $pull: { friend: mymail }})
      return {msg:`${email} has removed from friend`};
    }
  
    async getallFriend( user: User){
      const myfriend = user.friend;
      
      const res = await this.userModel.find({ email: { $in: myfriend }})
      return res;
    }
  }
  