import { Body, Controller, Post, HttpCode, HttpStatus, Request , UseGuards, Put, Param, Get} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, CheckDto, SetNicknameDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { Public } from 'src/shared/decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @ApiOperation({ summary: '로그인'})
  @Post('login')
  signIn(@Body() signInDto: AuthDto) {
    return this.authService.signIn(signInDto);
  }

  @Public()
  @ApiOperation({ summary: '회원가입'})
  @Post('signup')
  signUp(@Body() signUpDto: AuthDto) {
    return this.authService.signUp(signUpDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '로그아웃'})
  @Post('signout')
  async signOut(@Request() req)  {
    const email = req.user.email;
    return await this.authService.signOut(email);
  }

  @Public()
  @ApiOperation({ summary: 'email 체크'})
  @Post("checkemail")
  signUpcheck(@Body() checkDto: CheckDto) {
    return this.authService.checkDuplicateEmail(checkDto.email);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '닉네임설정'})
  @Put('nickname')
  updateNickname(@Request() req, @Body('nickname') nickname: string) {
    const email = req.user.email;
    return this.authService.updateNicknameByEmail(email, nickname);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '닉네임가져오기'})
  @Get('nickname')
  getNickname(@Request() req) {
    const email = req.user.email;
    return this.authService.getNicknameByEmail(email);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '친구 요청' })
  @Post('request')
  async sendFriendRequest(@Request() req, @Body('nickname') nickname: string) {
    const email = req.user.email;
    return await this.authService.sendFriendRequest(email, nickname);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('accept')
  async acceptFriendRequest(@Request() req) {
  const user_email = req.user.email;
  return await this.authService.acceptFriendRequest(user_email);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('reject')
  async rejectFriendRequest(@Request() req) {
  const user_email = req.user.email;
  return await this.authService.rejectFriendRequest(user_email);
  }

}