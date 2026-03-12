import { Knex } from 'knex';

function addBaseColumns(table: Knex.CreateTableBuilder, knex: Knex): void {
  table.uuid('uid').primary().defaultTo(knex.fn.uuid());
  table.uuid('tenant_uid').nullable();
  table.boolean('is_active').notNullable().defaultTo(true);
  table.string('created_by').nullable();
  table.string('modified_by').nullable();
  table.timestamp('created_at').defaultTo(knex.fn.now());
  table.timestamp('modified_at').defaultTo(knex.fn.now());
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sys_admins', (table) => {
    addBaseColumns(table, knex);
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').unique().notNullable();
    table.string('keycloak_sub').unique().notNullable();
  });

  await knex.schema.createTable('sys_admin_credentials', (table) => {
    addBaseColumns(table, knex);
    table.uuid('sys_admin_uid').references('uid').inTable('sys_admins').onDelete('CASCADE');
    table.string('credential_type').notNullable();
    table.text('credential_value').notNullable();
    table.timestamp('expires_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sys_admin_credentials');
  await knex.schema.dropTableIfExists('sys_admins');
}
