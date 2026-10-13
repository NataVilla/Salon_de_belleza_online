import { Transform } from 'class-transformer';

// Quita los espacios y pasa a minúsculas antes de validar, para que "Ana@X.com " y
// "ana@x.com" sean el mismo email. Lo aplica el ValidationPipe global (transform: true).
export function NormalizeEmail() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}

// Para normalizar fuera de un DTO (por ejemplo, al buscar por email en el login)
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
