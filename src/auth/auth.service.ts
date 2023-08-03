import { FriendSummary, Friendship, FriendshipSchema } from './schemas/auth.friend.schema';
import { AuthDto } from './dto/auth.dto';
import { Injectable, UnauthorizedException, BadRequestException,ConflictException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Auth, AuthSchema} from './schemas/auth.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  usersService: any;
  constructor(
    @InjectModel(Friendship.name) private friendshipModel: Model<Friendship>,
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    @InjectModel(FriendSummary.name) private friendSummaryModel: Model<FriendSummary>,
    private jwtService: JwtService,
    
  ) {}

  async signIn(authDto : AuthDto) {
    
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if(!emailRegex.test(authDto.email)) {
      throw new BadRequestException('유효한 이메일 형식이 아닙니다.');
    }
    
    const user = await this.authModel.findOne({ email: authDto.email });
    if (!user) {
      throw new UnauthorizedException('등록된 이메일이 아닙니다.');
    }
    
    const isPasswordMatched = await bcrypt.compare(authDto.password, user.password);

    if (!isPasswordMatched) {
        throw new UnauthorizedException('패스워드가 일치하지 않습니다.');
    }
    
    const payload = { email: user.email };
    user.online = true;
    await user.save();

    return {
      access_token: await this.jwtService.signAsync(payload),
      nickname: user.nickname,
    };
  }

  async signUp(authDto : AuthDto) {
  
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if(!emailRegex.test(authDto.email)) {
      throw new BadRequestException('유효한 이메일 형식이 아닙니다.');
    }
    
    const isUserExist = await this.authModel.exists({email: authDto.email});
    if (isUserExist) {
      throw new ConflictException('중복된 이메일입니다.');
    }

    if (authDto.password.length < 8) {
      throw new BadRequestException('패스워드는 8자리 이상이여야 합니다.')
    }

    const hashedPassword = await bcrypt.hash(authDto.password, 10);
    const user = await this.authModel.create({
        email : authDto.email,
        password: hashedPassword,
    });

    return {
       success: true
      };
    }

    async signOut(email : string) {
      const user = await this.authModel.findOne({ email: email });
      try{
        user.online = false;
        await user.save();
      }catch {
        return { success: false } ;
      }
      return {
         success: true
        };
      }

    async validateUser(payload: { email: string }): Promise<any> {
      const user = await this.authModel.findOne({ email: payload.email });
      if (user) {
        const { password, ...result } = user.toObject();
        return result;
      }
      return null;
    }

    async checkDuplicateEmail(email: string) {
      const isUserExist = await this.authModel.exists({ email: email });
      if (isUserExist) {
        throw new UnauthorizedException("중복된 이메일 입니다.");
      }
      return {
        succes: true,
      };
    }

    async updateNicknameByEmail(email: string, nickname: string) {
      const trimmedNickname = nickname.trim();
      if (trimmedNickname.includes(' ')) {
        throw new HttpException('닉네임에는 공백이 포함될 수 없습니다.', HttpStatus.BAD_REQUEST);
      }
      
      const existingUser = await this.authModel.findOne({ nickname: nickname })
      if (existingUser) {
        throw new BadRequestException('해당 닉네임은 이미 존재하는 닉네임입니다.');
      }
      
      const user = await this.authModel.findOne({ email: email });
      
      if (user.nickname !== null) {
        throw new BadRequestException('이미 닉네임이 설정되어 있습니다.');
      }

      user.nickname = nickname;
      await user.save();
      return { message: 'success'};
    }
  
    async getNicknameByEmail(email: string) {
      const user = await this.authModel.findOne({ email: email });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return { nickname: user.nickname };
    }

    async getUserByNickname(nickname: string) {
      const user = await this.authModel.findOne({ nickname: nickname });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    }

    async sendFriendRequest(senderEmail: string, receiverNickname: string) {
      // Find the sender and receiver in the database
      const sender = await this.authModel.findOne({ email: senderEmail });
      const receiver = await this.authModel.findOne({ nickname: receiverNickname });
    
      if (!sender || !receiver) {
        throw new Error('Sender or receiver not found.');
      }
    
      // Create a new friendship request and save it
      const friendRequest = new this.friendshipModel({
        user: sender._id,
        friend: receiver._id,
        isRequest: true,
        isConfirmed: false,
        isBlocked: false,
        nickname: sender.nickname,
        level: sender.level,
        online: sender.online,
      });
    
      // Save the friend request
      const savedFriendRequest = await friendRequest.save();
    
      // Add the sender's nickname to the receiver's friendRequests array and save it
      const friendRequestForReceiver = new this.friendshipModel({
        nickname: sender.nickname,
      });
    
      receiver.friendRequests.push(sender.nickname);
      await receiver.save();
      
      return savedFriendRequest;
    }

  async acceptFriendRequest(userEmail: string) {
      // Find the user with the given email
      const user = await this.authModel.findOne({ email: userEmail });
    
      if (!user) {
        throw new NotFoundException('User not found.');
      }
    
      // The friend request must be from the friend to the user
      const friendFriendRequest = await this.friendshipModel.findOne({
        friend: user._id,
        isRequest: true,
      });
    
      if (!friendFriendRequest) {
        throw new BadRequestException('Friend request not found.');
      }
    
      // Accept the friend request and update it in the database
      friendFriendRequest.isRequest = false;
      friendFriendRequest.isConfirmed = true;
      await friendFriendRequest.save();
    
      // Create a new FriendSummary object and add it to the user's friends array
      const friend = new this.friendSummaryModel({
        user: friendFriendRequest.friend,
        nickname: friendFriendRequest.nickname,
        online: friendFriendRequest.online,
        level: friendFriendRequest.level,
      });
      user.friends.push(friend);
      await user.save();
    
      // Find the friend who sent the request
      const friendUser = await this.authModel.findOne({ _id: friendFriendRequest.user });
      
      // Create a new FriendSummary object for the user who accepted the request
      const userSummary = new this.friendSummaryModel({
        user: user._id,
        nickname: user.nickname,
        online: user.online,
        level: user.level,
      });
    
      // Add the user to the friend's friends array
      friendUser.friends.push(userSummary);
        await friendUser.save();
      user.friendRequests = user.friendRequests.filter(request => request !== friendFriendRequest.nickname);
        await user.save();
    
      // Return the accepted friend request
      return {
        user: {
          nickname: user.nickname,
          online: user.online,
          level: user.level,
        },
        friend: {
          nickname: friendFriendRequest.nickname,
          online: friendFriendRequest.online,
          level: friendFriendRequest.level,
        },
      };
    }

  async rejectFriendRequest(userEmail: string) {
      // Find the user with the given email
      const user = await this.authModel.findOne({ email: userEmail });
    
      if (!user) {
        throw new NotFoundException('User not found.');
      }
    
      // The friend request must be from the friend to the user
      const friendFriendRequest = await this.friendshipModel.findOne({
        friend: user._id,
        isRequest: true,
      });
    
      if (!friendFriendRequest) {
        throw new BadRequestException('Friend request not found.');
      }
    
      // Delete the friend request from the database
      await this.friendshipModel.deleteOne({ _id: friendFriendRequest._id });
        user.friendRequests = user.friendRequests.filter(request => request !== friendFriendRequest.nickname);
      await user.save();
    
      // Return a message confirming the friend request was rejected
      return { message: 'Friend request rejected.' };
    }

    async getFriendList(userEmail: string) {
      const user = await this.authModel.findOne({ email: userEmail });
  
      if (!user) {
          throw new Error('User not found.');
      }
  
      const friendList = user.friends.map(friend => {
          return {
              nickname: friend.nickname,
              online: friend.online,
              level: friend.level
          };
      });
  
      const friendRequests = user.friendRequests.map(request => {
          return {
              nickname: request
          };
      });
  
      return {
          friendlist: friendList,
          friendRequests: friendRequests
      };
  }
}
  

