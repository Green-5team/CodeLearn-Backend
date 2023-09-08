import { CodingTestService } from "./../codingtest/codingtest.service";
// room.handlers.ts
import { CodeSubmission, ExtendedSocket } from "./interface";
import { Logger } from "@nestjs/common";
import { Namespace } from "socket.io";
import { RoomService } from "src/room/room.service";
import {
  RoomStatusChangeDto,
  TeamDto,
  UserInfoDto,
} from "src/room/dto/room.dto";
import { CompileResultDto } from "src/codingtest/dto/compileresult.dto";

export class ReviewHandlers {
  constructor(
    private readonly roomService: RoomService,
    private readonly codingService: CodingTestService,
    private readonly nsp: Namespace
  ) {}
  private logger = new Logger("Room");

  async handleReviewUser(
    title: string,
    review: boolean,
    socket: ExtendedSocket
  ): Promise<{ success: boolean; payload: any }> {
    const checkReuslt = await this.roomService.getResult(
      socket.room_id,
      socket.user_id,
      review
    );

    if (checkReuslt === false) {
      return {
        success: false,
        payload: { message: "버튼을 클릭할 수 없습니다." },
      };
    }

    const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
    await this.nsp.to(title).emit("room-status-changed", roomAndUserInfo);

    return { success: true, payload: { roomInfo: roomAndUserInfo } };
  }

  async handleSubmitCode(
    codeSubmission: CodeSubmission,
    socket: ExtendedSocket
  ) {
    const userOutputResult = [];
    const problem = await this.codingService.getProblemInput(
      codeSubmission.problemNumber
    );
    let result;
    let quiz_result = false;
    if (codeSubmission.script !== "") {
      for (const index of problem.input) {
        result = await this.codingService.executeCode(
          codeSubmission.script,
          codeSubmission.language,
          codeSubmission.versionIndex,
          index
        );
        if (!(result instanceof CompileResultDto)) {
          return {
            success: false,
            payload: { message: "제출을 실패했습니다. 다시 시도해주세요." },
          };
        }
        const resultOutput = result.output.replace(/\n/g, "");
        userOutputResult.push(resultOutput);
      }

      if (
        userOutputResult.length == problem.output.length &&
        userOutputResult.every(
          (value, index) => value === problem.output[index]
        )
      ) {
        await this.codingService.saveSolvedInfo(
          socket.decoded.email,
          codeSubmission.title
        );
        quiz_result = true;
      } else {
        const checkMode = await this.roomService.checkModeForCoop(
          codeSubmission.title
        );
        if (checkMode) {
          return {
            success: false,
            payload: { message: "틀렸습니다! 다시 시도해주세요." },
          };
        }
      }
    } else {
      const compileResult = new CompileResultDto();
      compileResult.output = "0";
      compileResult.memory = "0";
      compileResult.statuscode = "0";
      compileResult.cputime = "0";
      result = compileResult;
    }

    await this.codingService.saveSubmitInfo(
      socket.decoded.email,
      codeSubmission.title
    );
    const finish = await this.codingService.checkFinish(codeSubmission.title);

    if (finish.success == true) {
      if (finish.mode !== "STUDY") {
        await this.nsp.to(codeSubmission.title).emit("finishedGame", {
          title: codeSubmission.title,
          winner: finish.mode,
        });
      } else {
        await this.nsp
          .to(codeSubmission.title)
          .emit("finishedGame", { title: codeSubmission.title });
      }
    }

    let roomStatusChangeDto = new RoomStatusChangeDto();
    const roomAndUserInfo = await this.roomService.getRoomInfo(socket.room_id);
    if (typeof roomAndUserInfo !== "boolean") {
      roomStatusChangeDto = roomAndUserInfo;
    }
    return {
      success: true,
      payload: {
        quiz_result: quiz_result,
        result: result,
        user_info: roomStatusChangeDto.user_info,
      },
    };
  }

  async handleReviewPass(
    title: string,
    review: boolean,
    socket: ExtendedSocket
  ) {
    const check = await this.roomService.getResult(
      socket.room_id,
      socket.user_id,
      review
    );
    if (check === false) {
      return {
        success: false,
        payload: { message: "다시 버튼을 눌러주세요." },
      };
    }
    const reveiwAll = await this.roomService.checkReviewOrNot(title);
    const roomInfo = await this.roomService.getRoomInfo(socket.room_id);

    if (reveiwAll === false) {
      await this.roomService.resetUserStatus(socket.room_id);
      const roomInfo = await this.roomService.getRoomInfo(socket.room_id);
      this.nsp.to(title).emit("reviewFinished", roomInfo);
    } else {
      let reviewer;
      outerLoop: if (
        roomInfo instanceof RoomStatusChangeDto ||
        roomInfo instanceof TeamDto
      ) {
        for (const user of roomInfo.user_info) {
          if (user instanceof UserInfoDto) {
            if (user.review === true) {
              reviewer = user.nickname;
              break outerLoop;
            }
          }
        }
      }
      this.nsp.to(title).emit("room-status-changed", {
        roomInfo: roomInfo,
        reviewer: reviewer,
      });
    }

    return { success: false, payload: { message: "" } };
  }
}
