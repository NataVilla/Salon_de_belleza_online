import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { normalizeEmail } from '../common/decorators/normalize-email.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

// Costo del hash de bcrypt: 10 es el valor recomendado (seguridad vs. velocidad)
const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Un email duplicado (23505) lo traduce a 400 el DbExceptionFilter global
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create({
      ...createUserDto,
      password: await bcrypt.hash(createUserDto.password, SALT_ROUNDS),
    });
    return this.userRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find({ where: { isActive: true } });
  }

  // Un usuario borrado (inactivo) responde 404 igual que uno que no existe
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id, isActive: true });
    if (!user) {
      throw this.notFound();
    }
    return user;
  }

  // Para el login (Fase 2): devuelve null en lugar de lanzar 404, porque el login
  // responde 401 genérico. Incluye la contraseña hasheada para compararla; @Exclude
  // solo la oculta al serializar la respuesta. Un usuario borrado no puede iniciar sesión.
  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({
      email: normalizeEmail(email),
      isActive: true,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Se hashea en una copia para no modificar el DTO recibido
    const changes = updateUserDto.password
      ? {
          ...updateUserDto,
          password: await bcrypt.hash(updateUserDto.password, SALT_ROUNDS),
        }
      : updateUserDto;

    const user = await this.findOne(id);
    return this.userRepository.save(this.userRepository.merge(user, changes));
  }

  // Borrado lógico: el usuario queda inactivo en lugar de eliminarse
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.isActive = false;
    await this.userRepository.save(user);
  }

  // Sin el id: es un dato interno (UUID) que el usuario no ve
  private notFound() {
    return new NotFoundException('Usuario no encontrado.');
  }
}
