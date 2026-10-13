import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;

  const mockCustomerRepository = {
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
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar un arreglo de clientes activos', async () => {
      const expectedCustomers = [{ id: '1', name: 'Test', isActivate: true }];
      mockCustomerRepository.find.mockResolvedValue(expectedCustomers);

      const customers = await service.findAll();
      expect(customers).toEqual(expectedCustomers);
      expect(mockCustomerRepository.find).toHaveBeenCalledWith({
        where: { isActivate: true },
      });
    });
  });

  describe('findOne', () => {
    it('debería retornar un cliente activo si existe', async () => {
      const expectedCustomer = { id: '1', name: 'Test' };
      mockCustomerRepository.findOneBy.mockResolvedValue(expectedCustomer);

      const customer = await service.findOne('1');
      expect(customer).toEqual(expectedCustomer);
      expect(mockCustomerRepository.findOneBy).toHaveBeenCalledWith({
        id: '1',
        isActivate: true,
      });
    });

    // Con el filtro isActivate, un cliente borrado no aparece: la BD devuelve null
    it('debería lanzar NotFoundException si el cliente no existe o está inactivo', async () => {
      mockCustomerRepository.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(
        new NotFoundException('Cliente no encontrado.'),
      );
    });
  });

  describe('create', () => {
    it('debería crear y retornar un cliente', async () => {
      const createCustomerDto = { name: 'Test' } as any;
      const expectedCustomer = { id: '1', ...createCustomerDto };

      mockCustomerRepository.create.mockReturnValue(createCustomerDto);
      mockCustomerRepository.save.mockResolvedValue(expectedCustomer);

      const result = await service.create(createCustomerDto);
      expect(result).toEqual(expectedCustomer);
    });
  });

  describe('update', () => {
    it('debería actualizar y retornar el cliente', async () => {
      mockCustomerRepository.findOneBy.mockResolvedValue({
        id: '1',
        name: 'Test',
        isActivate: true,
      });
      mockCustomerRepository.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.update('1', { name: 'Test Updated' });
      expect(result).toEqual({ id: '1', name: 'Test Updated', isActivate: true });
      expect(mockCustomerRepository.findOneBy).toHaveBeenCalledWith({
        id: '1',
        isActivate: true,
      });
    });

    it('debería lanzar NotFoundException si el cliente no existe o está inactivo', async () => {
      mockCustomerRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update('1', { name: 'Test Updated' })).rejects.toThrow(
        new NotFoundException('Cliente no encontrado.'),
      );
      expect(mockCustomerRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debería desactivar al cliente exitosamente', async () => {
      const customer = { id: '1', isActivate: true };
      mockCustomerRepository.findOneBy.mockResolvedValue(customer);
      mockCustomerRepository.save.mockResolvedValue({ ...customer, isActivate: false });

      await service.remove('1');
      expect(customer.isActivate).toBe(false);
      expect(mockCustomerRepository.save).toHaveBeenCalledWith(customer);
    });

    it('debería lanzar NotFoundException si el cliente ya estaba borrado', async () => {
      mockCustomerRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
      expect(mockCustomerRepository.save).not.toHaveBeenCalled();
    });
  });
});
