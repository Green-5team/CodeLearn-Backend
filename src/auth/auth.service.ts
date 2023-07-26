import { AuthDto } from './dto/auth.dto';
import { Injectable, UnauthorizedException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Auth, AuthSchema} from './schemas/auth.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  usersService: any;
  constructor(
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    private jwtService: JwtService
  ) {}

  async signIn(authDto : AuthDto) {
    const user = await this.authModel.findOne({ email: authDto.email });
  if (!user) {
    throw new UnauthorizedException('Invalid email or password');
  }
    const isPasswordMatched = await bcrypt.compare(authDto.password, user.password);

    if (!isPasswordMatched) {
        throw new UnauthorizedException('Invalid email or password');
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
    const isUserExist = await this.authModel.exists({email: authDto.email});

    if (isUserExist) {
        throw new UnauthorizedException('Duplicate email');
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
        throw new UnauthorizedException("Duplicate email");
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
      user.nickname = nickname;
      await user.save();
      return { message: 'success'};
    }
   
}
