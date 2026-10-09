import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline: `users` y `customers` tal como existen hoy en la BD de desarrollo
 * (comparadas con las entidades el 2026-10-09). Los nombres de PK y UNIQUE son los
 * que ya generó TypeORM, para que `migration:generate` no vea diferencias.
 *
 * Usa IF NOT EXISTS para que también pueda correr sobre las BD que ya tienen estas
 * tablas (desarrollo y Railway): ahí solo queda registrada en la tabla `migrations`.
 */
export class Baseline1791500000000 implements MigrationInterface {
  name = 'Baseline1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "password" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "document" character varying NOT NULL,
        "name" character varying(255) NOT NULL,
        "lastName" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_68c9c024a07c49ad6a2072d23c6" UNIQUE ("document"),
        CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir la baseline borra los datos: solo tiene sentido en una BD de pruebas
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
