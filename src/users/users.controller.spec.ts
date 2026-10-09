import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un usuario llamando al servicio correspondiente', async () => {
    const dto: CreateUserDto = { name: 'Ana', email: 'ana@x.com', password: 'secreta' };
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería obtener todos los usuarios llamando a findAll del servicio', async () => {
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('debería obtener un usuario por id', async () => {
    const id = '1';
    await controller.findOne(id);
    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it('debería actualizar un usuario', async () => {
    const id = '1';
    const dto: UpdateUserDto = { name: 'Ana María' };
    await controller.update(id, dto);
    expect(service.update).toHaveBeenCalledWith(id, dto);
  });

  it('debería eliminar (desactivar) un usuario', async () => {
    const id = '1';
    await controller.remove(id);
    expect(service.remove).toHaveBeenCalledWith(id);
  });
});
