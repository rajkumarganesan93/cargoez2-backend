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
  await knex.schema.createTable('subscriptions', (table) => {
    addBaseColumns(table, knex);
    table.uuid('product_uid').references('uid').inTable('products');
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.decimal('price', 10, 2).notNullable();
    table.string('billing_cycle').notNullable().defaultTo('monthly');
  });

  await knex.schema.createTable('subscription_details', (table) => {
    addBaseColumns(table, knex);
    table.uuid('subscription_uid').references('uid').inTable('subscriptions').onDelete('CASCADE');
    table.string('feature_key').notNullable();
    table.string('feature_value').nullable();
    table.boolean('is_included').defaultTo(true);
  });

  await knex.schema.createTable('tenant_subscriptions', (table) => {
    addBaseColumns(table, knex);
    table.uuid('subscription_uid').references('uid').inTable('subscriptions');
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.string('status').notNullable().defaultTo('active');
  });

  await knex.schema.createTable('subscription_payment_transactions', (table) => {
    addBaseColumns(table, knex);
    table.uuid('tenant_subscription_uid').references('uid').inTable('tenant_subscriptions');
    table.decimal('amount', 12, 2).notNullable();
    table.string('currency').notNullable().defaultTo('USD');
    table.string('payment_method').nullable();
    table.string('transaction_ref').nullable();
    table.string('status').notNullable();
    table.timestamp('paid_at').nullable();
  });

  await knex.schema.createTable('tenant_usages', (table) => {
    addBaseColumns(table, knex);
    table.string('metric_key').notNullable();
    table.decimal('metric_value', 12, 2).notNullable().defaultTo(0);
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tenant_usages');
  await knex.schema.dropTableIfExists('subscription_payment_transactions');
  await knex.schema.dropTableIfExists('tenant_subscriptions');
  await knex.schema.dropTableIfExists('subscription_details');
  await knex.schema.dropTableIfExists('subscriptions');
}
