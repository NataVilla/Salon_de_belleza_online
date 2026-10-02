import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';

// Ambiente: development (por defecto), qa o production. Jest define NODE_ENV=test,
// así que los tests e2e usan la configuración de desarrollo.
const nodeEnv = process.env.NODE_ENV ?? 'development';
const envFile = nodeEnv === 'test' ? 'development' : nodeEnv;

const REQUIRED_ENV = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];

// Falla al arrancar si falta alguna variable, en lugar de fallar al conectar a la BD
function validateEnv(env: Record<string, unknown>) {
  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno en .env.${envFile}: ${missing.join(', ')}`,
    );
  }
  return env;
}

@Module({
  imports: [
    // Las variables del sistema (p. ej. las de Railway) tienen prioridad sobre el archivo
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${envFile}`],
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
        synchronize: false,
      }),
    }),
    UsersModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
