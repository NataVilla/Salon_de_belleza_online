import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

// exceptionFactory del ValidationPipe global. Arma la misma respuesta que Nest por
// defecto ({ statusCode: 400, message: [...], error: 'Bad Request' }), pero traduce el
// mensaje de forbidNonWhitelisted, que class-validator da en inglés
// ("property id should not exist"). Los demás mensajes ya están en español en los DTO.
export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException(flatten(errors));
}

function flatten(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([rule, message]) =>
      rule === 'whitelistValidation' ? `El campo ${path} no está permitido.` : message,
    );
    return [...own, ...flatten(error.children ?? [], path)];
  });
}
