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
  await knex.schema.createTable('admin_roles', (table) => {
    addBaseColumns(table, knex);
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.boolean('is_system').defaultTo(false);
  });

  await knex.schema.createTable('admin_permissions', (table) => {
    addBaseColumns(table, knex);
    table.uuid('module_uid').references('uid').inTable('modules').onDelete('CASCADE');
    table.uuid('operation_uid').references('uid').inTable('operations').onDelete('CASCADE');
    table.string('permission_key').unique().notNullable();
  });

  await knex.schema.createTable('admin_role_permissions', (table) => {
    addBaseColumns(table, knex);
    table.uuid('admin_role_uid').references('uid').inTable('admin_roles').onDelete('CASCADE');
    table.uuid('admin_permission_uid').references('uid').inTable('admin_permissions').onDelete('CASCADE');
    table.jsonb('conditions').nullable();
    table.string('granted_by').nullable();
    table.unique(['admin_role_uid', 'admin_permission_uid']);
  });

  await knex.schema.createTable('sys_admin_roles', (table) => {
    addBaseColumns(table, knex);
    table.uuid('sys_admin_uid').references('uid').inTable('sys_admins').onDelete('CASCADE');
    table.uuid('admin_role_uid').references('uid').inTable('admin_roles').onDelete('CASCADE');
    table.unique(['sys_admin_uid', 'admin_role_uid']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sys_admin_roles');
  await knex.schema.dropTableIfExists('admin_role_permissions');
  await knex.schema.dropTableIfExists('admin_permissions');
  await knex.schema.dropTableIfExists('admin_roles');
}
