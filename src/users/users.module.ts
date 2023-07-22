import { AuthModule } from "../auth/auth.module";
import { forwardRef, Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthSchema } from "src/auth/schemas/auth.schema";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: "Auth", schema: AuthSchema }]),
  ],
  providers: [UsersService, JwtService],
  exports: [UsersService],
})
export class UsersModule {}
