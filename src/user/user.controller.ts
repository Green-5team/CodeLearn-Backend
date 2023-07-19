import { Body, Controller, Get, Patch, Post, Query, UseGuards, Param, Req, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { UserRequestDto } from './dto/user.dto';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from './schemas/user.schema';
import {SignUpDto, LoginDto, UpdateDto, LostDto, RenameDto, GetoneDto} from "./dto"
import { ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}
    
    // @Post("/join")
    // @UsePipes(new ValidationPipe())
    // createUser(
    //     @Body() userRequestDto : UserRequestDto
    // ) : Promise<UserRequestDto> {
    //     return this.userService.createUser(userRequestDto);
    // }

    // @Post("/")
    // @UsePipes(new ValidationPipe())
    // validateUser(
    //     @Body() userRequestDto : UserRequestDto
    // ) : Promise<any> {
    //     return this.userService.validateUser(userRequestDto);
    // }

    @Post('/signup')
    signUp(@Body() signUpDto: SignUpDto): Promise<{ token: string }> {
      return this.userService.signUp(signUpDto);
    }
  
    @Post('/login')
    login(@Body() loginDto: LoginDto) {
      return this.userService.login(loginDto);
    }
  
    @Get('/logout')
    logout(@Request() req): any {
      //req.cookie.destroy();
      return { msg: 'The user has loggedout' }
    }
  
    @Patch('/update')
    @UseGuards(AuthGuard())
    update(@Body() updateDto: UpdateDto) {
      return this.userService.update(updateDto);
    }
  
    @Get('/lost')
    lost(@Body() lostDto: LostDto) {
      return this.userService.lost(lostDto);
    }
  
    @Patch('/rename')
    @UseGuards(AuthGuard())
    rename(@Body() renameDto: RenameDto) {
      return this.userService.rename(renameDto);
    }

    @Get('/getall')
    getall(){
      return  this.userService.getAll();
    }
    
    @Get("/getone")
    getOne(@Body() getoneDto: GetoneDto) {
      return this.userService.getOne(getoneDto);
    }
  
}
