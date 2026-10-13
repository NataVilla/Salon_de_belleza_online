import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  // Auth (Fase 2) usa el servicio, no el repositorio, para respetar sus reglas
  // (solo activos, contraseña hasheada, email normalizado)
  exports: [UsersService],
})
export class UsersModule {}
