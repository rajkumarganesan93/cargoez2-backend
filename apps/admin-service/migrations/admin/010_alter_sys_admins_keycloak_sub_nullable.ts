import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sys_admins', (table) => {
    table.string('keycloak_sub').nullable().alter();
  });
  await knex.raw('ALTER TABLE sys_admins DROP CONSTRAINT IF EXISTS sys_admins_keycloak_sub_unique');
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS sys_admins_keycloak_sub_unique ON sys_admins (keycloak_sub) WHERE keycloak_sub IS NOT NULL');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS sys_admins_keycloak_sub_unique');
  await knex.schema.alterTable('sys_admins', (table) => {
    table.string('keycloak_sub').unique().notNullable().alter();
  });
}
