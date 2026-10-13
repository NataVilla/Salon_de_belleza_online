import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UuidPipe } from '../common/pipes/uuid.pipe';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post('/create')
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get('/all')
  findAll() {
    return this.customersService.findAll();
  }

  // UuidPipe responde 400 si el id no es un UUID, antes de que llegue a la BD
  @Get(':id')
  findOne(@Param('id', UuidPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidPipe) id: string) {
    return this.customersService.remove(id);
  }
}
