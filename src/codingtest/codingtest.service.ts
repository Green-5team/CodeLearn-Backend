import { RoomService } from 'src/room/room.service';

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Problem } from './schemas/codingtest.schema';
import { Room } from 'src/room/schemas/room.schema';
import { CompileResultDto } from './dto/compileresult.dto';
import { RoomAndUser } from 'src/room/schemas/roomanduser.schema';
import { Auth } from 'src/auth/schemas/auth.schema';

@Injectable()
export class CodingTestService {
  constructor(private httpService: HttpService,
    private roomService: RoomService,
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    @InjectModel(Problem.name) private readonly problemModel: Model<Problem>,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    @InjectModel(RoomAndUser.name) private readonly roomAndUserModel: Model<RoomAndUser>,
  ) { }

  async executeCode(script: string, language: string, versionIndex: number, stdin: string) {
    if (script == null) {
      return {success : false, payload :{result :  'The script is empty!'}}
    }
    let s: string = stdin;
    let numbers: number[] = s.split(',').map(Number);
    stdin = numbers.join(' ');
    try {
      const response = this.httpService.post('https://api.jdoodle.com/v1/execute', {
        script,
        language,
        stdin,
        versionIndex,
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      });

      const responseContent = await firstValueFrom(response);

      const compileResult = new CompileResultDto;
      compileResult.output = responseContent.data.output;
      compileResult.memory = responseContent.data.memory;
      compileResult.statuscode = responseContent.data.statuscode;
      compileResult.cputime = responseContent.data.cputime;
      return compileResult;

    } catch {
      return {success : false, payload :{result :  'An error occurred while executing the code.'}};
    }
  }

  async getProblem(title : string) {
    const found = await this.roomModel.findOne({ title: title });
    const count = await this.problemModel.countDocuments({ level : found.level }); 
    const random = Math.floor(Math.random() * count);  
    const document = await this.problemModel.findOne({ level: found.level }).skip(random).exec(); 
    return document;
  }

  async getProblemInput(index : number) {
    const problem = await this.problemModel.findOne({ number: index });
    const input = problem.input;
    const output = problem.output;
    return { input, output };
  }

  async saveSolvedInfo(email: string, title : string) {
    const userInfo = await this.authModel.findOne({ email: email }).exec();
    const roomInfo = await this.roomModel.findOne({ title: title }).exec();
    const activeRoom = await this.roomAndUserModel.findOne({ room_id: roomInfo._id });
    const user_index = activeRoom.user_info.indexOf(userInfo._id.toString());

    activeRoom.solved[user_index] = true;
    await activeRoom.save();
  }

  // for testing about saving data with json struct
  async insertProblemToDB() {
   
    const js = {
      "number": 1,
      "level": 1,
      "title": "A+B",
      "contents": "두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.",
      "input_contents": "첫째 줄에 A와 B가 주어진다. (0 < A, B < 10)",
      "output_contents": "첫째 줄에 A+B를 출력한다.",
      "ex_input": "1 2",
      "ex_output": "3",
      "input":
      [ '1,2', '4,5', '234,9'],
      "output": 
      [ '3', '9', '243' ]
    }
     try {
       const problem = await this.problemModel.create(js);
       console.log('Problem successfully saved.');
     } catch (error) {
      console.error('An error occurred while saving the problem:', error);
    }
  }

}
