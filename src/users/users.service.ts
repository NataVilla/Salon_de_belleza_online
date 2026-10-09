import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs'; // <-- 1. Importamos bcrypt
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // 2. Definimos el "costo" del hasheo. 10 es el estándar recomendado (buen balance entre seguridad y velocidad).
      const saltRounds = 10;

      // 3. Hasheamos la contraseña que viene del DTO
      const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

      // 4. Creamos el usuario reemplazando la contraseña original por la hasheada
      const newUser = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });

      // 5. Guardamos en la base de datos
      const savedUser = await this.userRepository.save(newUser);
      return savedUser;
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('El email ya está registrado.');
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true }, // Traemos solo los activos por defecto
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Si el usuario está intentando actualizar su contraseña, también debemos hashearla
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.userRepository.preload({
      id,
      ...updateUserDto,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const updatedUser = await this.userRepository.save(user);
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id); // Reutilizamos findOne para validar que exista
    // Soft delete: en lugar de borrarlo de la BD, lo marcamos como inactivo
    // (Puedes usar this.userRepository.remove(user) si prefieres un Hard Delete)
    user.isActive = false;
    await this.userRepository.save(user);
  }
}
