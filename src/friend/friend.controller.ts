
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
    } from '@nestjs/common';
    import { FriendService } from './friend.service';
    import { Query as ExpressQuery } from 'express-serve-static-core';
    import { AuthGuard } from '@nestjs/passport';
    import { RequestFriendDto, AcceptFriendDto, RejectFriendDto, DeleteFriendDto } from "./dto"

    @Controller('friend')
    export class FriendController {
        constructor(private friendService: FriendService) {}
    
    
        @Post()
        @UseGuards(AuthGuard())
        requestFriend(@Body() requestfriendDto: RequestFriendDto, @Req() req) {
          return this.friendService.requestFriend(requestfriendDto, req.user);
        }
      
        @Post("/accept")
        @UseGuards(AuthGuard())
        acceptFriend(@Body() acceptfriendDto: AcceptFriendDto, @Req() req) {
          return this.friendService.acceptFriend(acceptfriendDto, req.user);
        }
      
        @Post("/reject")
        @UseGuards(AuthGuard())
        rejectFriend(@Body() rejectfriendDto: RejectFriendDto, @Req() req) {
          return this.friendService.rejectFriend(rejectfriendDto, req.user);
        }

        @Delete()
        @UseGuards(AuthGuard())
        deleteFriend(@Body() deletefriendDto: DeleteFriendDto, @Req() req) {
          return this.friendService.deleteFriend(deletefriendDto, req.user);
        }
      
        @Get()
        @UseGuards(AuthGuard())
        getallFriend(@Req() req) {
          return this.friendService.getallFriend(req.user);
        }
    
    }
    