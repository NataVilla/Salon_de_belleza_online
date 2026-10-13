import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';
import { UpdateCustomerDto } from './update-customer.dto';

// Reproduce lo que hace el ValidationPipe global: transformar (aplica @Trim) y validar
async function check<T extends object>(cls: new () => T, body: object) {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, fields: errors.map((e) => e.property) };
}

const valid = {
  document: '1020304050',
  name: 'Ana',
  lastName: 'Pérez Gómez',
  email: 'ana@example.com',
  phone: '3001234567',
};

describe('CreateCustomerDto', () => {
  it('acepta un cliente válido', async () => {
    const { fields } = await check(CreateCustomerDto, valid);
    expect(fields).toEqual([]);
  });

  it('quita los espacios al inicio y al final', async () => {
    const { dto, fields } = await check(CreateCustomerDto, {
      ...valid,
      name: '  Ana  ',
      phone: ' 3001234567 ',
    });
    expect(fields).toEqual([]);
    expect(dto.name).toBe('Ana');
    expect(dto.phone).toBe('3001234567');
  });

  it('normaliza el email: sin espacios y en minúsculas', async () => {
    const { dto, fields } = await check(CreateCustomerDto, {
      ...valid,
      email: ' Ana@Example.COM ',
    });
    expect(fields).toEqual([]);
    expect(dto.email).toBe('ana@example.com');
  });

  it('rechaza nombre y apellidos con solo espacios', async () => {
    const { fields } = await check(CreateCustomerDto, {
      ...valid,
      name: '   ',
      lastName: '   ',
    });
    expect(fields).toEqual(['name', 'lastName']);
  });

  it.each(['300123456', '30012345678', '300 123 4567', '+573001234567'])(
    'rechaza el celular %p (deben ser 10 dígitos)',
    async (phone) => {
      const { fields } = await check(CreateCustomerDto, { ...valid, phone });
      expect(fields).toEqual(['phone']);
    },
  );

  it.each(['10.203.040', 'CC1020', '', '123456789012345678901'])(
    'rechaza el documento %p (solo números, máximo 20)',
    async (document) => {
      const { fields } = await check(CreateCustomerDto, { ...valid, document });
      expect(fields).toEqual(['document']);
    },
  );

  it('rechaza textos de más de 255 caracteres', async () => {
    const { fields } = await check(CreateCustomerDto, {
      ...valid,
      name: 'a'.repeat(256),
    });
    expect(fields).toEqual(['name']);
  });

  it('rechaza un email inválido', async () => {
    const { fields } = await check(CreateCustomerDto, { ...valid, email: 'no-es-email' });
    expect(fields).toEqual(['email']);
  });

  it('exige todos los campos', async () => {
    const { fields } = await check(CreateCustomerDto, {});
    expect(fields.sort()).toEqual(['document', 'email', 'lastName', 'name', 'phone']);
  });

  it('da los mensajes en español', async () => {
    const dto = plainToInstance(CreateCustomerDto, { ...valid, phone: '123' });
    const [error] = await validate(dto);
    expect(Object.values(error.constraints ?? {})).toEqual([
      'El celular debe tener 10 dígitos.',
    ]);
  });
});

describe('UpdateCustomerDto', () => {
  it('acepta un cuerpo parcial', async () => {
    const { fields } = await check(UpdateCustomerDto, { name: 'Ana' });
    expect(fields).toEqual([]);
  });

  it('hereda las reglas y el @Trim del DTO de creación', async () => {
    const ok = await check(UpdateCustomerDto, { phone: ' 3001234567 ' });
    expect(ok.fields).toEqual([]);
    expect(ok.dto.phone).toBe('3001234567');

    const bad = await check(UpdateCustomerDto, { phone: '123' });
    expect(bad.fields).toEqual(['phone']);
  });
});
