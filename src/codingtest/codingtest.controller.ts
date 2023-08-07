import { Body, Controller, Get, Post, Req, UseGuards, Patch, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CodingTestService } from './codingtest.service';
import { CompileResultDto } from './dto/compileresult.dto';

@Controller('codingtest')
export class CodingtestController {
    roomService: any;
      constructor(private codingTestService: CodingTestService) { }
    
    @UseGuards(AuthGuard('jwt'))
    @Post('/execute')
    async executeCode(@Req() req, @Body() codePayload: { script: string, language: string, versionIndex: number, problemNumber : number, title : string }) {
        const userOutputResult = []; // 여기에 사용자가 제출한 코드로 아웃풋값 넣을 곳
        let result; 
        const problem = await this.codingTestService.getProblemInput(codePayload.problemNumber);
        for (const index of problem.input) {
            result = await this.codingTestService.executeCode(codePayload.script, codePayload.language, codePayload.versionIndex, index);
            if (!(result instanceof CompileResultDto)) {
                return result;
            }
            const resultOutput = result.output.replace(/\n/g, '');
            userOutputResult.push(resultOutput);
        }

        if (userOutputResult.length == problem.output.length && 
            userOutputResult.every((value, index) => value == problem.output[index])) {
            await this.codingTestService.saveSolvedInfo(req.user.email, codePayload.title);
            return { success: true, payload: { result : result } };
        } else {
            return { success: false, payload: { result : result } };
        }   
    }

    @Post('/')
    async getProblem(@Body('title') title: string) {
         const problem = await this.codingTestService.getProblem(title);
         return problem;
     }
 
     // @Post('/getProblem')
     // async getProblem(@Body('problem_number') problem: number[]) {
     //     const problemInfo = await this.codingTestService.getProblem(problem);
     //     return problemInfo;
     // }
 
     // async 
 
     // //FOR TESTING
     @Get('testing')
     async insertProblemToDB() {
         await this.codingTestService.insertProblemToDB();
     }

    //  @Patch('update-limit-time')
    //  async updateProblemLimitTime(@Body() updateData: { number: number, limitTime: number }) {
    //      try {
    //          await this.codingTestService.updateProblemLimitTime(updateData.number, updateData.limitTime);
    //          return { status: 'Attempted to update problem.' };
    //      } catch (error) {
    //          console.error('An error occurred while updating the problem:', error);
    //          throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    //      }
    //  }
     
    }
/*python 

input = sys.readline
def 
a, b = input().split()
print(int(a) + int(b))

*/