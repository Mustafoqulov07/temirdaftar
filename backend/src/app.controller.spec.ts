import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            user: { count: jest.fn(), findMany: jest.fn() },
            store: { count: jest.fn() },
            customer: { count: jest.fn() },
            debt: { count: jest.fn() },
            payment: { count: jest.fn(), aggregate: jest.fn() },
            debtItem: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API status object', () => {
      const res = appController.getHello();
      expect(res.status).toBe('ok');
      expect(res.name).toBe('Temirdaftar API');
    });
  });
});
