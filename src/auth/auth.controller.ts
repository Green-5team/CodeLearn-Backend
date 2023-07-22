import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthDto } from "./dto/auth.dto";
import { AuthGuard } from "./auth.guard";
import { Public } from "src/shared/decorators/public.decorator";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  signIn(@Body() signInDto: AuthDto) {
    console.log(signInDto);
    // login 할 때, email, password를 전달함
    return this.authService.signIn(signInDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("signupcheck")
  signUpcheck(@Body("email") email: string) {
    return this.authService.checkDuplicateEmail(email);
  }
}
