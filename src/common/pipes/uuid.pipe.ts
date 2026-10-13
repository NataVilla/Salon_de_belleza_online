import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

// ParseUUIDPipe con el mensaje en español. Responde 400 antes de que un id inválido
// llegue a PostgreSQL (que respondería con un error 22P02 → 500).
export const UuidPipe = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('El id debe ser un UUID válido.'),
});
