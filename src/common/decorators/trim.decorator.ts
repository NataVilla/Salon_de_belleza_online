import { Transform } from 'class-transformer';

// Quita los espacios al inicio y al final antes de validar, para que "   " no pase
// @IsNotEmpty. Lo aplica el ValidationPipe global (transform: true).
export function Trim() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
