import { existsSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { envFile, validateEnv } from '../config/env';

// DataSource para el CLI de TypeORM (migraciones) y los scripts (seed), que corren
// fuera de Nest. Usa el mismo .env que la app; las variables del sistema tienen
// prioridad porque loadEnvFile no sobrescribe las que ya existen.
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
const env = validateEnv(process.env) as Record<string, string>;

export default new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
