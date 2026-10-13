import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Validación a nivel HTTP (pipes globales + UuidPipe). Todas las peticiones son
// inválidas: se rechazan con 400 antes de llegar a la BD, así que no escriben nada.
describe('Validación (e2e)', () => {
  let app: INestApplication<App>;
  const someUuid = '00000000-0000-4000-8000-000000000000';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('UUID inválido → 400', () => {
    it.each([
      ['get', '/customers/no-es-uuid'],
      ['patch', '/customers/no-es-uuid'],
      ['delete', '/customers/no-es-uuid'],
      ['get', '/users/no-es-uuid'],
      ['patch', '/users/no-es-uuid'],
      ['delete', '/users/no-es-uuid'],
    ] as const)('%s %s', async (method, url) => {
      const res = await request(app.getHttpServer())[method](url).send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('El id debe ser un UUID válido.');
    });
  });

  describe('DTO inválido → 400 con mensajes en español', () => {
    it('POST /customers/create informa cada campo inválido', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers/create')
        .send({
          document: '12a',
          name: '   ',
          lastName: 'a'.repeat(256),
          email: 'no-es-email',
          phone: '300123456',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'El documento debe tener solo números (máximo 20).',
          'El nombre es obligatorio.',
          'Los apellidos no pueden tener más de 255 caracteres.',
          'El email no es válido.',
          'El celular debe tener 10 dígitos.',
        ]),
      );
    });

    it('POST /users/create exige contraseña de al menos 8 caracteres', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/create')
        .send({ name: 'Ana', email: 'ana@example.com', password: '1234567' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual([
        'La contraseña debe tener al menos 8 caracteres.',
      ]);
    });

    it('rechaza propiedades que no están en el DTO (por ejemplo, el id)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/create')
        .send({ id: someUuid, name: 'Ana', email: 'ana@example.com', password: 'x' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining(['El campo id no está permitido.']),
      );
    });

    it('PATCH /customers/:id valida aunque el cuerpo sea parcial', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/customers/${someUuid}`)
        .send({ phone: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(['El celular debe tener 10 dígitos.']);
    });
  });
});
