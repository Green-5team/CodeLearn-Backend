import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CodingTestService } from './codingtest.service';
import { CodingtestController } from './codingtest.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Problem, ProblemSchema } from './schemas/codingtest.schema';
import { Room, RoomSchemas } from 'src/room/schemas/room.schema';
import { AuthModule } from 'src/auth/auth.module';
import { RoomModule } from 'src/room/room.module';
import { RoomAndUser, RoomAndUserSchema } from 'src/room/schemas/roomanduser.schema';
import { PassportModule } from '@nestjs/passport';
import { AuthSchema } from 'src/auth/schemas/auth.schema';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    HttpModule,
    AuthModule,
    RoomModule,
    MongooseModule.forFeature([
      { name: Problem.name, schema: ProblemSchema },
      { name: Room.name, schema: RoomSchemas },
      { name: RoomAndUser.name, schema: RoomAndUserSchema },
      { name: 'Auth', schema: AuthSchema },
    ]),
    
  ],
  providers: [CodingTestService],
  exports: [CodingTestService],
  controllers: [CodingtestController],
})
export class CodingtestModule {}
