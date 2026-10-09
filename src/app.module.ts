import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbExceptionFilter } from './common/filters/db-exception.filter';
import { envFile, validateEnv } from './config/env';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
    // Las variables del sistema (p. ej. las de Railway) tienen prioridad sobre el archivo
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [envFile],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string>('DB_PORT')),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,
        // El esquema se maneja solo con migraciones (src/database/migrations)
        synchronize: false,
      }),
    }),
    UsersModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Pipe y filtro globales declarados aquí (y no en main.ts) para que los e2e,
    // que levantan AppModule sin pasar por main.ts, se comporten igual que la app
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    { provide: APP_FILTER, useClass: DbExceptionFilter },
  ],
})
export class AppModule {}
