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
  // --- Freight ---
  await knex.schema.createTable('shipments', (table) => {
    addBaseColumns(table, knex);
    table.string('shipment_number').notNullable();
    table.string('origin').notNullable();
    table.string('destination').notNullable();
    table.string('mode').notNullable().defaultTo('air');
    table.string('status').notNullable().defaultTo('draft');
    table.string('shipper_name').nullable();
    table.string('consignee_name').nullable();
    table.decimal('weight', 12, 3).nullable();
    table.string('weight_unit').defaultTo('kg');
    table.integer('pieces').nullable();
    table.date('etd').nullable();
    table.date('eta').nullable();
    table.text('remarks').nullable();
    table.unique(['tenant_uid', 'shipment_number']);
  });

  // --- Contacts ---
  await knex.schema.createTable('contacts', (table) => {
    addBaseColumns(table, knex);
    table.string('contact_type').notNullable().defaultTo('company');
    table.string('company_name').nullable();
    table.string('first_name').nullable();
    table.string('last_name').nullable();
    table.string('email').nullable();
    table.string('phone').nullable();
    table.string('mobile').nullable();
    table.string('address_line1').nullable();
    table.string('address_line2').nullable();
    table.string('city').nullable();
    table.string('state').nullable();
    table.string('country').nullable();
    table.string('postal_code').nullable();
    table.string('tax_id').nullable();
    table.text('notes').nullable();
  });

  // --- Books (Invoices) ---
  await knex.schema.createTable('invoices', (table) => {
    addBaseColumns(table, knex);
    table.string('invoice_number').notNullable();
    table.uuid('contact_uid').nullable().references('uid').inTable('contacts').onDelete('SET NULL');
    table.uuid('shipment_uid').nullable().references('uid').inTable('shipments').onDelete('SET NULL');
    table.date('invoice_date').notNullable();
    table.date('due_date').nullable();
    table.string('currency').defaultTo('USD');
    table.decimal('subtotal', 14, 2).defaultTo(0);
    table.decimal('tax_amount', 14, 2).defaultTo(0);
    table.decimal('total_amount', 14, 2).defaultTo(0);
    table.string('status').notNullable().defaultTo('draft');
    table.text('notes').nullable();
    table.unique(['tenant_uid', 'invoice_number']);
  });

  await knex.schema.createTable('invoice_items', (table) => {
    addBaseColumns(table, knex);
    table.uuid('invoice_uid').references('uid').inTable('invoices').onDelete('CASCADE');
    table.string('description').notNullable();
    table.decimal('quantity', 10, 3).defaultTo(1);
    table.decimal('unit_price', 14, 2).defaultTo(0);
    table.decimal('amount', 14, 2).defaultTo(0);
    table.integer('sort_order').defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('contacts');
  await knex.schema.dropTableIfExists('shipments');
}
