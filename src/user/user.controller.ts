import { Body, Controller, Get, Patch, Post, Query, UseGuards, Param, Req, Request, UsePipes, ValidationPipe, Delete } from '@nestjs/common';
import { UserRequestDto } from './dto/user.dto';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from './schemas/user.schema';
import {SignUpDto, LoginDto, UpdateDto, LostDto, RenameDto, GetoneDto, RequestFriendDto, AcceptFriendDto, DeleteFriendDto, RejectFriendDto} from "./dto"

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
    login(@Body() loginDto: LoginDto): Promise<{ token: string }> {
      return this.userService.login(loginDto);
    }
  
    @Get('/logout')
    logout(@Request() req): any {
      req.cookie.destroy();
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
  
    @Post("/requestfriend")
    @UseGuards(AuthGuard())
    requestFriend(@Body() requestfriendDto: RequestFriendDto, @Req() req) {
      return this.userService.requestFriend(requestfriendDto, req.user);
    }
  
    @Get("/acceptfriend")
    @UseGuards(AuthGuard())
    acceptFriend(@Body() acceptfriendDto: AcceptFriendDto, @Req() req) {
      return this.userService.acceptFriend(acceptfriendDto, req.user);
    }
  
    @Delete("/deletefriend")
    @UseGuards(AuthGuard())
    deleteFriend(@Body() deletefriendDto: DeleteFriendDto, @Req() req) {
      return this.userService.deleteFriend(deletefriendDto, req.user);
    }
    
    @Get("/rejectfriend")
    @UseGuards(AuthGuard())
    rejectFriend(@Body() rejectfriendDto: RejectFriendDto, @Req() req) {
      return this.userService.rejectFriend(rejectfriendDto, req.user);
    }
  
    @Get("/getallfriend")
    @UseGuards(AuthGuard())
    getallFriend(@Req() req) {
      return this.userService.getallFriend(req.user);
    }
}
