import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-user-dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
