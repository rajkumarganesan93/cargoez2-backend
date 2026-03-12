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
  await knex.schema.createTable('meta_data', (table) => {
    addBaseColumns(table, knex);
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
  });

  await knex.schema.createTable('meta_data_details', (table) => {
    addBaseColumns(table, knex);
    table.uuid('meta_data_uid').references('uid').inTable('meta_data');
    table.string('code').notNullable();
    table.string('name').notNullable();
    table.string('value').nullable();
    table.integer('sort_order').defaultTo(0);
    table.unique(['meta_data_uid', 'code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('meta_data_details');
  await knex.schema.dropTableIfExists('meta_data');
}
