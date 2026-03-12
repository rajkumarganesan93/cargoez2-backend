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
    table.string('code').notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.string('icon').nullable();
    table.integer('sort_order').defaultTo(0);
    table.unique(['tenant_uid', 'code']);
  });

  await knex.schema.createTable('operations', (table) => {
    addBaseColumns(table, knex);
    table.string('code').notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.unique(['tenant_uid', 'code']);
  });

  await knex.schema.createTable('roles', (table) => {
    addBaseColumns(table, knex);
    table.string('code').notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.boolean('is_system').defaultTo(false);
    table.unique(['tenant_uid', 'code']);
  });

  await knex.schema.createTable('permissions', (table) => {
    addBaseColumns(table, knex);
    table.uuid('module_uid').references('uid').inTable('modules').onDelete('CASCADE');
    table.uuid('operation_uid').references('uid').inTable('operations').onDelete('CASCADE');
    table.string('permission_key').notNullable();
    table.unique(['tenant_uid', 'module_uid', 'operation_uid']);
  });

  await knex.schema.createTable('role_permissions', (table) => {
    addBaseColumns(table, knex);
    table.uuid('role_uid').references('uid').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_uid').references('uid').inTable('permissions').onDelete('CASCADE');
    table.jsonb('conditions').nullable();
    table.string('granted_by').nullable();
    table.unique(['role_uid', 'permission_uid']);
  });

  await knex.schema.createTable('app_customer_roles', (table) => {
    addBaseColumns(table, knex);
    table.uuid('app_customer_uid').notNullable();
    table.uuid('role_uid').references('uid').inTable('roles').onDelete('CASCADE');
    table.unique(['app_customer_uid', 'role_uid']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('app_customer_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('operations');
  await knex.schema.dropTableIfExists('modules');
}
