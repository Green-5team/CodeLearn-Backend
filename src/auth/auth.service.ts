import { AuthDto } from "./dto/auth.dto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Auth, AuthSchema } from "./schemas/auth.schema";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  usersService: any;
  constructor(
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    private jwtService: JwtService
  ) {}

  async signIn(authDto: AuthDto) {
    const user = await this.authModel.findOne({ email: authDto.email });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const isPasswordMatched = await bcrypt.compare(
      authDto.password,
      user.password
    );

    if (!isPasswordMatched) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const payload = { email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signUp(authDto: AuthDto) {
    const isUserExist = await this.authModel.exists({ email: authDto.email });

    if (isUserExist) {
      throw new UnauthorizedException("Duplicate email");
    }

    const hashedPassword = await bcrypt.hash(authDto.password, 10);
    const user = await this.authModel.create({
      email: authDto.email,
      password: hashedPassword,
    });

    return {
      success: true,
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
}
