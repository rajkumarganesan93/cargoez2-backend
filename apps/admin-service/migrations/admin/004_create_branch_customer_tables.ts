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
  await knex.schema.createTable('branch_customers', (table) => {
    addBaseColumns(table, knex);
    table.string('company_name').nullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').nullable();
    table.string('phone').nullable();
  });

  await knex.schema.createTable('branch_customer_credentials', (table) => {
    addBaseColumns(table, knex);
    table.uuid('branch_customer_uid').references('uid').inTable('branch_customers').onDelete('CASCADE');
    table.string('credential_type').notNullable();
    table.text('credential_value').notNullable();
    table.timestamp('expires_at').nullable();
  });

  await knex.schema.createTable('rel_branch_customers', (table) => {
    addBaseColumns(table, knex);
    table.uuid('branch_uid').references('uid').inTable('branches');
    table.uuid('branch_customer_uid').references('uid').inTable('branch_customers');
    table.unique(['branch_uid', 'branch_customer_uid']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rel_branch_customers');
  await knex.schema.dropTableIfExists('branch_customer_credentials');
  await knex.schema.dropTableIfExists('branch_customers');
}
