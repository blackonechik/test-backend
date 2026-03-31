import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1743150000000 implements MigrationInterface {
  name = 'InitialSchema1743150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "displayName" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "refreshTokenHash" character varying,
        "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_accounts_email" UNIQUE ("email"),
        CONSTRAINT "UQ_accounts_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_email" ON "accounts" ("email")`,
    );

    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "publishedAt" TIMESTAMP NOT NULL,
        "authorId" uuid NOT NULL,
        CONSTRAINT "PK_articles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_articles_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_articles_authorId" ON "articles" ("authorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_articles_publishedAt" ON "articles" ("publishedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
