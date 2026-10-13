import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  // Un documento duplicado (23505) lo traduce a 400 el DbExceptionFilter global
  create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepository.create(createCustomerDto);
    return this.customerRepository.save(customer);
  }

  findAll(): Promise<Customer[]> {
    return this.customerRepository.find({ where: { isActivate: true } });
  }

  // Un cliente borrado (inactivo) responde 404 igual que uno que no existe
  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOneBy({ id, isActivate: true });
    if (!customer) {
      throw this.notFound();
    }
    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    return this.customerRepository.save(
      this.customerRepository.merge(customer, updateCustomerDto),
    );
  }

  // Borrado lógico: el cliente queda inactivo en lugar de eliminarse
  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    customer.isActivate = false;
    await this.customerRepository.save(customer);
  }

  // Sin el id: es un dato interno (UUID) que el usuario no ve
  private notFound() {
    return new NotFoundException('Cliente no encontrado.');
  }
}
