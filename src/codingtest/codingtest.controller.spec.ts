import { Test, TestingModule } from '@nestjs/testing';
import { CodingtestController } from './codingtest.controller';

describe('CodingtestController', () => {
  let controller: CodingtestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CodingtestController],
    }).compile();

    controller = module.get<CodingtestController>(CodingtestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
