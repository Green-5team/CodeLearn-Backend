
import { Body, Controller, Post, HttpCode, HttpStatus, Request , UseGuards, Put, Param} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, CheckDto, SetNicknameDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { Public } from 'src/shared/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: AuthDto) {
    console.log(signInDto);
    // login 할 때, email, password를 전달함
    return this.authService.signIn(signInDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('signup')
  signUp(@Body() signUpDto: AuthDto) {
    return this.authService.signUp(signUpDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("checkemail")
  signUpcheck(@Body() checkDto: CheckDto) {
    return this.authService.checkDuplicateEmail(checkDto.email);
  }

  
  @UseGuards(AuthGuard('jwt'))
  @Put('nickname')
  updateNickname(@Request() req, @Body('nickname') nickname: string) {
    const email = req.user.email;
    return this.authService.updateNicknameByEmail(email, nickname);
  }
}