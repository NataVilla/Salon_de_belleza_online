import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const mockDataSource = { query: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: DataSource, useValue: mockDataSource }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('debería responder ok si la BD responde', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      expect(await appController.health()).toEqual({ status: 'ok', database: 'up' });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('debería responder 503 sin exponer el error si la BD no responde', async () => {
      mockDataSource.query.mockRejectedValue(new Error('connection refused'));

      const error = await appController.health().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toEqual({
        status: 'error',
        database: 'down',
      });
    });
  });
});
