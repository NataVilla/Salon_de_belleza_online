import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // PORT es opcional: Railway la define como variable del sistema, que tiene prioridad sobre el .env
  const port = Number(app.get(ConfigService).get<string>('PORT') ?? 3000);
  await app.listen(port);
}
bootstrap();
