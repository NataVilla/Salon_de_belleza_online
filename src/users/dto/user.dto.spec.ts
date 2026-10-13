import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

// Reproduce lo que hace el ValidationPipe global: transformar (aplica @Trim) y validar
async function check<T extends object>(cls: new () => T, body: object) {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, fields: errors.map((e) => e.property) };
}

const valid = { name: 'Ana', email: 'ana@example.com', password: 'secreta123' };

describe('CreateUserDto', () => {
  it('acepta un usuario válido', async () => {
    const { fields } = await check(CreateUserDto, valid);
    expect(fields).toEqual([]);
  });

  it('quita los espacios del nombre y del email, pero no de la contraseña', async () => {
    const { dto } = await check(CreateUserDto, {
      name: '  Ana ',
      email: ' ana@example.com ',
      password: ' secreta123 ',
    });
    expect(dto.name).toBe('Ana');
    expect(dto.email).toBe('ana@example.com');
    expect(dto.password).toBe(' secreta123 ');
  });

  it('normaliza el email: sin espacios y en minúsculas', async () => {
    const { dto, fields } = await check(CreateUserDto, {
      ...valid,
      email: '  Ana.Perez@Example.COM ',
    });
    expect(fields).toEqual([]);
    expect(dto.email).toBe('ana.perez@example.com');
  });

  it('rechaza un nombre con solo espacios', async () => {
    const { fields } = await check(CreateUserDto, { ...valid, name: '   ' });
    expect(fields).toEqual(['name']);
  });

  it('exige al menos 8 caracteres en la contraseña', async () => {
    expect(
      (await check(CreateUserDto, { ...valid, password: '1234567' })).fields,
    ).toEqual(['password']);
    expect(
      (await check(CreateUserDto, { ...valid, password: '12345678' })).fields,
    ).toEqual([]);
  });

  it('rechaza contraseñas de más de 72 caracteres (límite de bcrypt)', async () => {
    const { fields } = await check(CreateUserDto, { ...valid, password: 'a'.repeat(73) });
    expect(fields).toEqual(['password']);
  });

  it('rechaza textos de más de 255 caracteres', async () => {
    const { fields } = await check(CreateUserDto, { ...valid, name: 'a'.repeat(256) });
    expect(fields).toEqual(['name']);
  });

  it('rechaza un email inválido', async () => {
    const { fields } = await check(CreateUserDto, { ...valid, email: 'no-es-email' });
    expect(fields).toEqual(['email']);
  });

  it('da los mensajes en español', async () => {
    const dto = plainToInstance(CreateUserDto, { ...valid, password: 'corta' });
    const [error] = await validate(dto);
    expect(Object.values(error.constraints ?? {})).toEqual([
      'La contraseña debe tener al menos 8 caracteres.',
    ]);
  });
});

describe('UpdateUserDto', () => {
  it('acepta un cuerpo parcial y hereda las reglas', async () => {
    expect((await check(UpdateUserDto, { name: 'Ana' })).fields).toEqual([]);
    expect((await check(UpdateUserDto, { password: 'corta' })).fields).toEqual([
      'password',
    ]);
  });

  it('también normaliza el email al actualizar', async () => {
    const { dto } = await check(UpdateUserDto, { email: ' ANA@Example.com' });
    expect(dto.email).toBe('ana@example.com');
  });
});
