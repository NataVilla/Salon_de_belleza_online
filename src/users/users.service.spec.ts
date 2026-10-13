import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    merge: jest.fn((entity: object, changes: object) => Object.assign(entity, changes)),
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

    // El 400 lo arma el DbExceptionFilter global (ver db-exception.filter.spec.ts)
    it('debería dejar pasar el error de email duplicado al filtro global', async () => {
      const duplicate = new QueryFailedError('INSERT ...', [], new Error('23505'));
      mockUserRepository.create.mockImplementation((user) => user);
      mockUserRepository.save.mockRejectedValue(duplicate);

      await expect(
        service.create({ name: 'Ana', email: 'ana@x.com', password: 'secreta123' }),
      ).rejects.toBe(duplicate);
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
    it('debería buscar solo usuarios activos', async () => {
      const user = { id: '1', isActive: true };
      mockUserRepository.findOneBy.mockResolvedValue(user);

      expect(await service.findOne('1')).toBe(user);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        id: '1',
        isActive: true,
      });
    });

    // Con el filtro isActive, un usuario borrado no aparece: la BD devuelve null
    it('debería lanzar NotFoundException si el usuario no existe o está inactivo', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(
        new NotFoundException('Usuario no encontrado.'),
      );
    });
  });

  describe('findByEmail', () => {
    it('debería buscar con el email normalizado y solo entre activos', async () => {
      const user = { id: '1', email: 'ana@x.com', password: 'hash', isActive: true };
      mockUserRepository.findOneBy.mockResolvedValue(user);

      const result = await service.findByEmail('  Ana@X.com ');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        email: 'ana@x.com',
        isActive: true,
      });
      // Incluye la contraseña hasheada: el login la necesita para compararla
      expect(result?.password).toBe('hash');
    });

    it('debería devolver null (no lanzar 404) si no existe o está inactivo', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findByEmail('nadie@x.com')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    const activeUser = () => ({ id: '1', name: 'Ana', password: 'hash', isActive: true });

    it('debería aplicar los cambios y guardar', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(activeUser());
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.update('1', { name: 'Ana María' });

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        id: '1',
        isActive: true,
      });
      expect(result.name).toBe('Ana María');
    });

    it('debería hashear la contraseña nueva', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(activeUser());
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.update('1', { password: 'nueva12345' });

      expect(await bcrypt.compare('nueva12345', result.password)).toBe(true);
    });

    it('no debería modificar el DTO recibido', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(activeUser());
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
      const dto = { password: 'nueva12345' };

      await service.update('1', dto);

      expect(dto.password).toBe('nueva12345');
    });

    it('debería lanzar NotFoundException si el usuario no existe o está inactivo', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update('1', { name: 'Ana' })).rejects.toThrow(
        new NotFoundException('Usuario no encontrado.'),
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
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

    it('debería lanzar NotFoundException si el usuario ya estaba borrado', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });
});
