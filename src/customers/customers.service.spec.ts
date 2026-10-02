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
    preload: jest.fn(),
  };

  beforeEach(async () => {
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
    it('debería retornar un cliente si existe', async () => {
      const expectedCustomer = { id: '1', name: 'Test' };
      mockCustomerRepository.findOneBy.mockResolvedValue(expectedCustomer);

      const customer = await service.findOne('1');
      expect(customer).toEqual(expectedCustomer);
    });

    it('debería lanzar NotFoundException si el cliente no existe', async () => {
      mockCustomerRepository.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
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
      const updateCustomerDto = { name: 'Test Updated' } as any;
      const expectedCustomer = { id: '1', ...updateCustomerDto };

      mockCustomerRepository.preload.mockResolvedValue(expectedCustomer);
      mockCustomerRepository.save.mockResolvedValue(expectedCustomer);

      const result = await service.update('1', updateCustomerDto);
      expect(result).toEqual(expectedCustomer);
    });

    it('debería lanzar NotFoundException si el cliente a actualizar no existe', async () => {
      const updateCustomerDto = { name: 'Test Updated' } as any;
      mockCustomerRepository.preload.mockResolvedValue(null);

      await expect(service.update('1', updateCustomerDto)).rejects.toThrow(
        NotFoundException,
      );
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
  });
});
