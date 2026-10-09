// Ambiente: development (por defecto), qa o production. Jest define NODE_ENV=test,
// así que los tests usan la configuración de desarrollo.
const nodeEnv = process.env.NODE_ENV ?? 'development';
export const envFile = `.env.${nodeEnv === 'test' ? 'development' : nodeEnv}`;

export const REQUIRED_ENV = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
];

// Falla al arrancar si falta alguna variable, en lugar de fallar al conectar a la BD
export function validateEnv(env: Record<string, unknown>) {
  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno en ${envFile}: ${missing.join(', ')}`);
  }
  return env;
}
