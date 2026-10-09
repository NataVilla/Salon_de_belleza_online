import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

// Nombre en español de las columnas que pueden salir en un error de duplicado
const FIELD_LABELS: Record<string, string> = {
  email: 'email',
  document: 'documento',
  name: 'nombre',
};

interface PgDriverError {
  code?: string;
  detail?: string;
}

/**
 * Traduce los errores de PostgreSQL a respuestas HTTP:
 * - 23505 (unique_violation) → 400 indicando el campo duplicado
 * - 23P01 (exclusion_violation, solapamiento de horarios) → 409
 * Cualquier otro error de BD → 500 sin exponer el detalle.
 */
@Catch(QueryFailedError)
export class DbExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DbExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();
    const { code, detail } = exception.driverError as PgDriverError;

    if (code === '23505') {
      const field = parseField(detail);
      const label = field ? (FIELD_LABELS[field] ?? field) : undefined;
      return httpAdapter.reply(
        response,
        {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: label
            ? `Ya existe un registro con ese ${label}.`
            : 'El registro ya existe.',
          field,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (code === '23P01') {
      return httpAdapter.reply(
        response,
        {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'El horario se cruza con otro ya registrado.',
        },
        HttpStatus.CONFLICT,
      );
    }

    this.logger.error(exception.message, exception.stack);
    return httpAdapter.reply(
      response,
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno del servidor.',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

// detail de PostgreSQL: 'Key (email)=(ana@x.com) already exists.' → 'email'.
// No depende del idioma del servidor ('La llave (email)=(...) ya existe.').
function parseField(detail?: string): string | undefined {
  const match = detail?.match(/\(([^)]+)\)=\(/);
  return match?.[1].replace(/"/g, '');
}
