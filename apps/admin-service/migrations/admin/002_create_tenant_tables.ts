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
  await knex.schema.createTable('tenants', (table) => {
    addBaseColumns(table, knex);
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.uuid('tenant_type_uid').references('uid').inTable('meta_data_details');
    table.uuid('country_uid').references('uid').inTable('meta_data_details');
    table.string('db_strategy').notNullable().defaultTo('shared');
    table.string('db_host').nullable();
    table.integer('db_port').nullable();
    table.string('db_name').nullable();
    table.string('db_user').nullable();
    table.string('db_password').nullable();
    table.string('logo_url').nullable();
  });

  await knex.schema.createTable('branches', (table) => {
    addBaseColumns(table, knex);
    table.string('code').notNullable();
    table.string('name').notNullable();
    table.string('address').nullable();
    table.string('city').nullable();
    table.uuid('country_uid').references('uid').inTable('meta_data_details');
    table.unique(['tenant_uid', 'code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('branches');
  await knex.schema.dropTableIfExists('tenants');
}
