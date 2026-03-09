import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('name').notNullable().unique();
    table.string('description').nullable();
    table.boolean('is_system').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.string('created_by').nullable();
    table.string('modified_by').nullable();
    table.string('tenant_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('modules', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('code').notNullable().unique();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.string('icon').nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.string('created_by').nullable();
    table.string('modified_by').nullable();
    table.string('tenant_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('screens', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('module_id').notNullable().references('id').inTable('modules').onDelete('CASCADE');
    table.string('code').notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.string('created_by').nullable();
    table.string('modified_by').nullable();
    table.string('tenant_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.unique(['module_id', 'code']);
  });

  await knex.schema.createTable('operations', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('code').notNullable().unique();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.string('created_by').nullable();
    table.string('modified_by').nullable();
    table.string('tenant_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('module_id').notNullable().references('id').inTable('modules').onDelete('CASCADE');
    table.uuid('screen_id').notNullable().references('id').inTable('screens').onDelete('CASCADE');
    table.uuid('operation_id').notNullable().references('id').inTable('operations').onDelete('CASCADE');
    table.string('permission_key').notNullable().unique();
    table.string('created_by').nullable();
    table.string('modified_by').nullable();
    table.string('tenant_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.unique(['module_id', 'screen_id', 'operation_id']);
  });

  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.jsonb('conditions').nullable();
    table.string('created_by').nullable();
    table.string('modified_by').nullable();
    table.string('tenant_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.unique(['role_id', 'permission_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('operations');
  await knex.schema.dropTableIfExists('screens');
  await knex.schema.dropTableIfExists('modules');
  await knex.schema.dropTableIfExists('roles');
}
