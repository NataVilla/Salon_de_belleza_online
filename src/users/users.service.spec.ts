import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    preload: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debería guardar la contraseña hasheada, no en texto plano', async () => {
      const dto = { name: 'Ana', email: 'ana@x.com', password: 'secreta123' };
      mockUserRepository.create.mockImplementation((user) => user);
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.create(dto);

      expect(result.password).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, result.password)).toBe(true);
    });

    it('debería lanzar BadRequestException si el email ya existe', async () => {
      mockUserRepository.create.mockImplementation((user) => user);
      mockUserRepository.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.create({ name: 'Ana', email: 'ana@x.com', password: 'secreta123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('debería retornar solo los usuarios activos', async () => {
      const expectedUsers = [{ id: '1', name: 'Ana', isActive: true }];
      mockUserRepository.find.mockResolvedValue(expectedUsers);

      expect(await service.findAll()).toEqual(expectedUsers);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });

  describe('findOne', () => {
    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debería hashear la contraseña nueva', async () => {
      mockUserRepository.preload.mockImplementation((user) => Promise.resolve(user));
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.update('1', { password: 'nueva12345' });

      expect(await bcrypt.compare('nueva12345', result.password)).toBe(true);
    });

    it('debería lanzar NotFoundException si el usuario a actualizar no existe', async () => {
      mockUserRepository.preload.mockResolvedValue(null);
      await expect(service.update('1', { name: 'Ana' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('debería desactivar al usuario en lugar de borrarlo', async () => {
      const user = { id: '1', isActive: true };
      mockUserRepository.findOneBy.mockResolvedValue(user);

      await service.remove('1');

      expect(user.isActive).toBe(false);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });
  });
});
