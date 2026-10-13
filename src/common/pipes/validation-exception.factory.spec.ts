import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { validationExceptionFactory } from './validation-exception.factory';

const error = (
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError =>
  Object.assign(new ValidationError(), { property, constraints, children });

describe('validationExceptionFactory', () => {
  it('responde 400 con la misma forma que Nest por defecto', () => {
    const exception = validationExceptionFactory([
      error('phone', { matches: 'El celular debe tener 10 dígitos.' }),
    ]);

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: ['El celular debe tener 10 dígitos.'],
    });
  });

  it('traduce el mensaje de propiedad no permitida', () => {
    const exception = validationExceptionFactory([
      error('id', { whitelistValidation: 'property id should not exist' }),
      error('name', { isNotEmpty: 'El nombre es obligatorio.' }),
    ]);

    expect((exception.getResponse() as { message: string[] }).message).toEqual([
      'El campo id no está permitido.',
      'El nombre es obligatorio.',
    ]);
  });

  it('incluye los errores de objetos anidados con su ruta', () => {
    const exception = validationExceptionFactory([
      error('address', {}, [
        error('zip', { whitelistValidation: 'property zip should not exist' }),
      ]),
    ]);

    expect((exception.getResponse() as { message: string[] }).message).toEqual([
      'El campo address.zip no está permitido.',
    ]);
  });
});
