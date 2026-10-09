import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-user-dto';
import { UpdateCustomerDto } from './dto/update-customer-dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const newCustomer = this.customerRepository.create(createCustomerDto);
    const savedCustomer = await this.customerRepository.save(newCustomer);
    return savedCustomer;
  }

  async findAll(): Promise<Customer[]> {
    return await this.customerRepository.find({
      where: { isActivate: true },
    });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOneBy({ id });
    if (!customer) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.customerRepository.preload({
      id,
      ...updateCustomerDto,
    });
    if (!customer) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const updateCustomer = await this.customerRepository.save(customer);
    return updateCustomer;
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    customer.isActivate = false;
    await this.customerRepository.save(customer);
  }
}
