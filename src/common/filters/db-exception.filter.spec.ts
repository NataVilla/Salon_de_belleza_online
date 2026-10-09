import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import { DbExceptionFilter } from './db-exception.filter';

describe('DbExceptionFilter', () => {
  const response = {};
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  let reply: jest.Mock;
  let filter: DbExceptionFilter;

  const pgError = (driverError: object) =>
    new QueryFailedError('INSERT ...', [], Object.assign(new Error('pg'), driverError));

  beforeEach(() => {
    reply = jest.fn();
    filter = new DbExceptionFilter({
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost);
  });

  it('debería responder 400 con el campo duplicado (23505)', () => {
    filter.catch(
      pgError({ code: '23505', detail: 'Key (email)=(ana@x.com) already exists.' }),
      host,
    );
    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        statusCode: 400,
        field: 'email',
        message: 'Ya existe un registro con ese email.',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('debería reconocer el campo aunque PostgreSQL responda en español', () => {
    filter.catch(
      pgError({ code: '23505', detail: 'La llave (document)=(123) ya existe.' }),
      host,
    );
    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        field: 'document',
        message: 'Ya existe un registro con ese documento.',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('debería responder 400 genérico si no puede leer el campo', () => {
    filter.catch(pgError({ code: '23505' }), host);
    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({ message: 'El registro ya existe.', field: undefined }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('debería responder 409 ante un solapamiento (23P01)', () => {
    filter.catch(pgError({ code: '23P01' }), host);
    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({ statusCode: 409 }),
      HttpStatus.CONFLICT,
    );
  });

  it('debería responder 500 sin exponer el detalle ante otros errores', () => {
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(pgError({ code: '42P01', detail: 'tabla secreta' }), host);
    expect(reply).toHaveBeenCalledWith(
      response,
      { statusCode: 500, message: 'Error interno del servidor.' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});
