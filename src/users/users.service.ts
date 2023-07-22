import { JwtService } from "@nestjs/jwt";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ObjectId } from "mongoose";
import { Auth } from "src/auth/schemas/auth.schema";
import { UserStatus } from "src/room/room.model";

// This should be a real class/interface representing a user entity
export type User = any;

@Injectable()
export class UsersService {
  validateUser(payload: any) {
    throw new Error("Method not implemented.");
  }
  constructor(
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    private jwtService: JwtService
  ) {}

  async userInfoFromEmail(email: string): Promise<any> {
    const user = await this.authModel.findOne({ email: email });
    return user;
  }

  async readyToken(token: string): Promise<ObjectId | null> {
    const decoded = await this.jwtService.decode(token);
    const user = decoded as { email: string };
    const email = user?.email;

    const dbUser = await this.authModel.findOne({ email });
    return dbUser._id;
  }

  async updateUserStatus(userId: ObjectId, status: UserStatus): Promise<User> {
    // console.log(`Updating status for user ID: ${userId}`);
    // console.log(`New status: ${status}`); // New status logging
    const user = await this.authModel.findById(userId);
    // if (!user) {
    //   console.error(`User with id ${userId} does not exist`);
    //   throw new Error(`User with id ${userId} does not exist`);
    // }
    const updatedUser = await this.authModel.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );
    // Logging the status of the returned user
    // console.log(`Updated user status: ${updatedUser?.status}`);

    // console.log(`Updated user: ${JSON.stringify(updatedUser)}`);
    return updatedUser;
  }
}
