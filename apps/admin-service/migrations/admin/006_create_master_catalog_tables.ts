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
  await knex.schema.createTable('modules', (table) => {
    addBaseColumns(table, knex);
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.string('icon').nullable();
    table.integer('sort_order').defaultTo(0);
  });

  await knex.schema.createTable('operations', (table) => {
    addBaseColumns(table, knex);
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('operations');
  await knex.schema.dropTableIfExists('modules');
}
