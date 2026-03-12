const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} = require('docx');
const ExcelJS = require('exceljs');

const DOCS_DIR = path.resolve(__dirname, '../../docs');

const BASE_ENTITY_COLUMNS = [
  { name: 'uid', type: 'uuid', nullable: 'NO', default: 'uuid()', constraints: 'PRIMARY KEY', description: 'Unique identifier' },
  { name: 'tenant_uid', type: 'uuid', nullable: 'YES', default: null, constraints: '', description: 'Tenant reference' },
  { name: 'is_active', type: 'boolean', nullable: 'NO', default: 'true', constraints: '', description: 'Soft delete flag' },
  { name: 'created_by', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Creator identifier' },
  { name: 'modified_by', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Last modifier identifier' },
  { name: 'created_at', type: 'timestamp', nullable: 'NO', default: 'now()', constraints: '', description: 'Creation timestamp' },
  { name: 'modified_at', type: 'timestamp', nullable: 'NO', default: 'now()', constraints: '', description: 'Last modification timestamp' },
];

const ADMIN_DB_TABLES = [
  {
    name: 'meta_data',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Unique code identifier' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Display name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
    ],
  },
  {
    name: 'meta_data_details',
    columns: [
      { name: 'meta_data_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> meta_data', description: 'Reference to parent meta_data' },
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE(meta_data_uid, code)', description: 'Detail code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Display name' },
      { name: 'value', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Detail value' },
      { name: 'sort_order', type: 'integer', nullable: 'NO', default: '0', constraints: '', description: 'Display sort order' },
    ],
  },
  {
    name: 'tenants',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Unique tenant code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Tenant name' },
      { name: 'tenant_type_uid', type: 'uuid', nullable: 'YES', default: null, constraints: 'FK -> meta_data_details', description: 'Tenant type reference' },
      { name: 'country_uid', type: 'uuid', nullable: 'YES', default: null, constraints: 'FK -> meta_data_details', description: 'Country reference' },
      { name: 'db_strategy', type: 'string', nullable: 'NO', default: "'shared'", constraints: '', description: 'Database strategy (shared/dedicated)' },
      { name: 'db_host', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Dedicated DB host' },
      { name: 'db_port', type: 'integer', nullable: 'YES', default: null, constraints: '', description: 'Dedicated DB port' },
      { name: 'db_name', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Dedicated DB name' },
      { name: 'db_user', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Dedicated DB user' },
      { name: 'db_password', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Dedicated DB password' },
      { name: 'logo_url', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Tenant logo URL' },
    ],
  },
  {
    name: 'branches',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE(tenant_uid, code)', description: 'Branch code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Branch name' },
      { name: 'address', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Address' },
      { name: 'city', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'City' },
      { name: 'country_uid', type: 'uuid', nullable: 'YES', default: null, constraints: 'FK -> meta_data_details', description: 'Country reference' },
    ],
  },
  {
    name: 'app_customers',
    columns: [
      { name: 'branch_uid', type: 'uuid', nullable: 'YES', default: null, constraints: 'FK -> branches', description: 'Branch reference' },
      { name: 'first_name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'First name' },
      { name: 'last_name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Last name' },
      { name: 'email', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Email address' },
      { name: 'phone', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Phone number' },
      { name: 'keycloak_sub', type: 'string', nullable: 'YES', default: null, constraints: 'Partial UNIQUE (WHERE NOT NULL)', description: 'Keycloak subject ID' },
    ],
  },
  {
    name: 'app_customer_credentials',
    columns: [
      { name: 'app_customer_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> app_customers CASCADE', description: 'App customer reference' },
      { name: 'credential_type', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Credential type' },
      { name: 'credential_value', type: 'text', nullable: 'NO', default: null, constraints: '', description: 'Credential value' },
      { name: 'expires_at', type: 'timestamp', nullable: 'YES', default: null, constraints: '', description: 'Expiration timestamp' },
    ],
  },
  {
    name: 'branch_customers',
    columns: [
      { name: 'company_name', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Company name' },
      { name: 'first_name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'First name' },
      { name: 'last_name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Last name' },
      { name: 'email', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Email address' },
      { name: 'phone', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Phone number' },
    ],
  },
  {
    name: 'branch_customer_credentials',
    columns: [
      { name: 'branch_customer_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> branch_customers CASCADE', description: 'Branch customer reference' },
      { name: 'credential_type', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Credential type' },
      { name: 'credential_value', type: 'text', nullable: 'NO', default: null, constraints: '', description: 'Credential value' },
      { name: 'expires_at', type: 'timestamp', nullable: 'YES', default: null, constraints: '', description: 'Expiration timestamp' },
    ],
  },
  {
    name: 'rel_branch_customers',
    columns: [
      { name: 'branch_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> branches', description: 'Branch reference' },
      { name: 'branch_customer_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> branch_customers', description: 'Branch customer reference' },
    ],
  },
  {
    name: 'sys_admins',
    columns: [
      { name: 'first_name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'First name' },
      { name: 'last_name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Last name' },
      { name: 'email', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Email address' },
      { name: 'keycloak_sub', type: 'string', nullable: 'YES', default: null, constraints: 'Partial UNIQUE (WHERE NOT NULL)', description: 'Keycloak subject ID' },
    ],
  },
  {
    name: 'sys_admin_credentials',
    columns: [
      { name: 'sys_admin_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> sys_admins CASCADE', description: 'Sys admin reference' },
      { name: 'credential_type', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Credential type' },
      { name: 'credential_value', type: 'text', nullable: 'NO', default: null, constraints: '', description: 'Credential value' },
      { name: 'expires_at', type: 'timestamp', nullable: 'YES', default: null, constraints: '', description: 'Expiration timestamp' },
    ],
  },
  {
    name: 'modules',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Module code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Module name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
      { name: 'icon', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Icon identifier' },
      { name: 'sort_order', type: 'integer', nullable: 'NO', default: '0', constraints: '', description: 'Display sort order' },
    ],
  },
  {
    name: 'operations',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Operation code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Operation name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
    ],
  },
  {
    name: 'products',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Product code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Product name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
    ],
  },
  {
    name: 'product_details',
    columns: [
      { name: 'product_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> products CASCADE', description: 'Product reference' },
      { name: 'detail_key', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Detail key' },
      { name: 'detail_value', type: 'text', nullable: 'YES', default: null, constraints: '', description: 'Detail value' },
      { name: 'sort_order', type: 'integer', nullable: 'NO', default: '0', constraints: '', description: 'Display sort order' },
    ],
  },
  {
    name: 'subscriptions',
    columns: [
      { name: 'product_uid', type: 'uuid', nullable: 'YES', default: null, constraints: 'FK -> products', description: 'Product reference' },
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Subscription code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Subscription name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
      { name: 'price', type: 'decimal(10,2)', nullable: 'NO', default: null, constraints: '', description: 'Price' },
      { name: 'billing_cycle', type: 'string', nullable: 'NO', default: "'monthly'", constraints: '', description: 'Billing cycle' },
    ],
  },
  {
    name: 'subscription_details',
    columns: [
      { name: 'subscription_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> subscriptions CASCADE', description: 'Subscription reference' },
      { name: 'feature_key', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Feature key' },
      { name: 'feature_value', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Feature value' },
      { name: 'is_included', type: 'boolean', nullable: 'NO', default: 'true', constraints: '', description: 'Whether feature is included' },
    ],
  },
  {
    name: 'tenant_subscriptions',
    columns: [
      { name: 'subscription_uid', type: 'uuid', nullable: 'YES', default: null, constraints: 'FK -> subscriptions', description: 'Subscription reference' },
      { name: 'start_date', type: 'date', nullable: 'NO', default: null, constraints: '', description: 'Subscription start date' },
      { name: 'end_date', type: 'date', nullable: 'YES', default: null, constraints: '', description: 'Subscription end date' },
      { name: 'status', type: 'string', nullable: 'NO', default: "'active'", constraints: '', description: 'Subscription status' },
    ],
  },
  {
    name: 'subscription_payment_transactions',
    columns: [
      { name: 'tenant_subscription_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> tenant_subscriptions', description: 'Tenant subscription reference' },
      { name: 'amount', type: 'decimal(12,2)', nullable: 'NO', default: null, constraints: '', description: 'Payment amount' },
      { name: 'currency', type: 'string', nullable: 'NO', default: "'USD'", constraints: '', description: 'Currency code' },
      { name: 'payment_method', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Payment method' },
      { name: 'transaction_ref', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'External transaction reference' },
      { name: 'status', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Transaction status' },
      { name: 'paid_at', type: 'timestamp', nullable: 'YES', default: null, constraints: '', description: 'Payment timestamp' },
    ],
  },
  {
    name: 'tenant_usages',
    columns: [
      { name: 'metric_key', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Usage metric key' },
      { name: 'metric_value', type: 'decimal(12,2)', nullable: 'NO', default: '0', constraints: '', description: 'Metric value' },
      { name: 'period_start', type: 'date', nullable: 'NO', default: null, constraints: '', description: 'Period start date' },
      { name: 'period_end', type: 'date', nullable: 'NO', default: null, constraints: '', description: 'Period end date' },
    ],
  },
  {
    name: 'admin_roles',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Role code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Role name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
      { name: 'is_system', type: 'boolean', nullable: 'NO', default: 'false', constraints: '', description: 'System role flag' },
    ],
  },
  {
    name: 'admin_permissions',
    columns: [
      { name: 'module_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> modules CASCADE', description: 'Module reference' },
      { name: 'operation_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> operations CASCADE', description: 'Operation reference' },
      { name: 'permission_key', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE', description: 'Permission key' },
    ],
  },
  {
    name: 'admin_role_permissions',
    columns: [
      { name: 'admin_role_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> admin_roles CASCADE', description: 'Admin role reference' },
      { name: 'admin_permission_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> admin_permissions CASCADE', description: 'Admin permission reference' },
      { name: 'conditions', type: 'jsonb', nullable: 'YES', default: null, constraints: '', description: 'Permission conditions' },
      { name: 'granted_by', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Granted by identifier' },
    ],
  },
  {
    name: 'sys_admin_roles',
    columns: [
      { name: 'sys_admin_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> sys_admins CASCADE', description: 'Sys admin reference' },
      { name: 'admin_role_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> admin_roles CASCADE', description: 'Admin role reference' },
    ],
  },
];

const SHARED_TENANT_DB_TABLES = [
  {
    name: 'modules',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE(tenant_uid, code)', description: 'Module code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Module name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
      { name: 'icon', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Icon identifier' },
      { name: 'sort_order', type: 'integer', nullable: 'NO', default: '0', constraints: '', description: 'Display sort order' },
    ],
  },
  {
    name: 'operations',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE(tenant_uid, code)', description: 'Operation code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Operation name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
    ],
  },
  {
    name: 'roles',
    columns: [
      { name: 'code', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE(tenant_uid, code)', description: 'Role code' },
      { name: 'name', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Role name' },
      { name: 'description', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Description' },
      { name: 'is_system', type: 'boolean', nullable: 'NO', default: 'false', constraints: '', description: 'System role flag' },
    ],
  },
  {
    name: 'permissions',
    columns: [
      { name: 'module_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> modules CASCADE', description: 'Module reference' },
      { name: 'operation_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> operations CASCADE', description: 'Operation reference' },
      { name: 'permission_key', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE(tenant_uid, module_uid, operation_uid)', description: 'Permission key' },
    ],
  },
  {
    name: 'role_permissions',
    columns: [
      { name: 'role_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> roles CASCADE', description: 'Role reference' },
      { name: 'permission_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> permissions CASCADE', description: 'Permission reference' },
      { name: 'conditions', type: 'jsonb', nullable: 'YES', default: null, constraints: '', description: 'Permission conditions' },
      { name: 'granted_by', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Granted by identifier' },
    ],
  },
  {
    name: 'app_customer_roles',
    columns: [
      { name: 'app_customer_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'UNIQUE(app_customer_uid, role_uid)', description: 'App customer reference' },
      { name: 'role_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> roles CASCADE', description: 'Role reference' },
    ],
  },
  {
    name: 'shipments',
    columns: [
      { name: 'shipment_number', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE(tenant_uid, shipment_number)', description: 'Shipment number' },
      { name: 'origin', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Origin location' },
      { name: 'destination', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Destination location' },
      { name: 'mode', type: 'string', nullable: 'NO', default: "'air'", constraints: '', description: 'Shipment mode' },
      { name: 'status', type: 'string', nullable: 'NO', default: "'draft'", constraints: '', description: 'Shipment status' },
      { name: 'shipper_name', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Shipper name' },
      { name: 'consignee_name', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Consignee name' },
      { name: 'weight', type: 'decimal(12,3)', nullable: 'YES', default: null, constraints: '', description: 'Total weight' },
      { name: 'weight_unit', type: 'string', nullable: 'NO', default: "'kg'", constraints: '', description: 'Weight unit' },
      { name: 'pieces', type: 'integer', nullable: 'YES', default: null, constraints: '', description: 'Number of pieces' },
      { name: 'etd', type: 'date', nullable: 'YES', default: null, constraints: '', description: 'Estimated time of departure' },
      { name: 'eta', type: 'date', nullable: 'YES', default: null, constraints: '', description: 'Estimated time of arrival' },
      { name: 'remarks', type: 'text', nullable: 'YES', default: null, constraints: '', description: 'Remarks' },
    ],
  },
  {
    name: 'contacts',
    columns: [
      { name: 'contact_type', type: 'string', nullable: 'NO', default: "'company'", constraints: '', description: 'Contact type' },
      { name: 'company_name', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Company name' },
      { name: 'first_name', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'First name' },
      { name: 'last_name', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Last name' },
      { name: 'email', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Email address' },
      { name: 'phone', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Phone number' },
      { name: 'mobile', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Mobile number' },
      { name: 'address_line1', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Address line 1' },
      { name: 'address_line2', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Address line 2' },
      { name: 'city', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'City' },
      { name: 'state', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'State/Province' },
      { name: 'country', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Country' },
      { name: 'postal_code', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Postal/ZIP code' },
      { name: 'tax_id', type: 'string', nullable: 'YES', default: null, constraints: '', description: 'Tax identification number' },
      { name: 'notes', type: 'text', nullable: 'YES', default: null, constraints: '', description: 'Notes' },
    ],
  },
  {
    name: 'invoices',
    columns: [
      { name: 'invoice_number', type: 'string', nullable: 'NO', default: null, constraints: 'UNIQUE(tenant_uid, invoice_number)', description: 'Invoice number' },
      { name: 'contact_uid', type: 'uuid', nullable: 'YES', default: null, constraints: 'FK -> contacts SET NULL', description: 'Contact reference' },
      { name: 'shipment_uid', type: 'uuid', nullable: 'YES', default: null, constraints: 'FK -> shipments SET NULL', description: 'Shipment reference' },
      { name: 'invoice_date', type: 'date', nullable: 'NO', default: null, constraints: '', description: 'Invoice date' },
      { name: 'due_date', type: 'date', nullable: 'YES', default: null, constraints: '', description: 'Payment due date' },
      { name: 'currency', type: 'string', nullable: 'NO', default: "'USD'", constraints: '', description: 'Currency code' },
      { name: 'subtotal', type: 'decimal(14,2)', nullable: 'NO', default: '0', constraints: '', description: 'Subtotal amount' },
      { name: 'tax_amount', type: 'decimal(14,2)', nullable: 'NO', default: '0', constraints: '', description: 'Tax amount' },
      { name: 'total_amount', type: 'decimal(14,2)', nullable: 'NO', default: '0', constraints: '', description: 'Total amount' },
      { name: 'status', type: 'string', nullable: 'NO', default: "'draft'", constraints: '', description: 'Invoice status' },
      { name: 'notes', type: 'text', nullable: 'YES', default: null, constraints: '', description: 'Notes' },
    ],
  },
  {
    name: 'invoice_items',
    columns: [
      { name: 'invoice_uid', type: 'uuid', nullable: 'NO', default: null, constraints: 'FK -> invoices CASCADE', description: 'Invoice reference' },
      { name: 'description', type: 'string', nullable: 'NO', default: null, constraints: '', description: 'Item description' },
      { name: 'quantity', type: 'decimal(10,3)', nullable: 'NO', default: '1', constraints: '', description: 'Quantity' },
      { name: 'unit_price', type: 'decimal(14,2)', nullable: 'NO', default: '0', constraints: '', description: 'Unit price' },
      { name: 'amount', type: 'decimal(14,2)', nullable: 'NO', default: '0', constraints: '', description: 'Line item amount' },
      { name: 'sort_order', type: 'integer', nullable: 'NO', default: '0', constraints: '', description: 'Display sort order' },
    ],
  },
];

// ─── DOCX GENERATION ────────────────────────────────────────────────────────────

const THIN_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: '999999',
};

const CELL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

function docxHeaderCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    shading: { fill: 'D9D9D9' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, font: 'Calibri' })],
      }),
    ],
  });
}

function docxCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || '', size: 20, font: 'Calibri' })],
      }),
    ],
  });
}

function buildDocxTable(headers, rows, widths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => docxHeaderCell(h, widths[i])),
    tableHeader: true,
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell, i) => docxCell(cell, widths[i])),
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function buildTableSection(tableDef) {
  const headers = ['Column Name', 'Data Type', 'Nullable', 'Default', 'Constraints'];
  const widths = [22, 18, 10, 15, 35];

  const allCols = [...BASE_ENTITY_COLUMNS, ...tableDef.columns];
  const rows = allCols.map((c) => [c.name, c.type, c.nullable, c.default || '-', c.constraints || '-']);

  return [
    new Paragraph({
      text: tableDef.name,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    }),
    buildDocxTable(headers, rows, widths),
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];
}

async function generateDocx() {
  const sections = [];

  // Title page content
  const titleChildren = [
    new Paragraph({ spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'CargoEz', bold: true, size: 56, font: 'Calibri', color: '2E74B5' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Database Schema Reference', bold: true, size: 40, font: 'Calibri' }),
      ],
    }),
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Multi-Tenant SaaS Architecture', italics: true, size: 28, font: 'Calibri', color: '666666' }),
      ],
    }),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 22, font: 'Calibri', color: '999999' }),
      ],
    }),
  ];

  // Table of Contents section
  const tocChildren = [
    new Paragraph({
      text: 'Table of Contents',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '1. Base Entity Columns', size: 24, font: 'Calibri' })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '2. admin_db (24 tables) - Central Management Database', size: 24, font: 'Calibri' })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '3. shared_db / tenant_db (10 tables) - Tenant Data', size: 24, font: 'Calibri' })],
      spacing: { after: 80 },
    }),
  ];

  // Base Entity section
  const baseEntityChildren = [
    new Paragraph({
      text: '1. Base Entity Columns',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'The following columns are present in ALL tables across every database.', size: 22, font: 'Calibri', italics: true }),
      ],
      spacing: { after: 200 },
    }),
    buildDocxTable(
      ['Column Name', 'Data Type', 'Nullable', 'Default', 'Constraints'],
      BASE_ENTITY_COLUMNS.map((c) => [c.name, c.type, c.nullable, c.default || '-', c.constraints || '-']),
      [22, 18, 10, 15, 35],
    ),
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];

  // admin_db section
  const adminDbChildren = [
    new Paragraph({
      text: '2. admin_db - Central Management Database',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `This database contains ${ADMIN_DB_TABLES.length} tables for central administration including tenants, users, subscriptions, and access control.`, size: 22, font: 'Calibri' }),
      ],
      spacing: { after: 200 },
    }),
  ];
  for (const tableDef of ADMIN_DB_TABLES) {
    adminDbChildren.push(...buildTableSection(tableDef));
  }

  // shared_db / tenant_db section
  const sharedDbChildren = [
    new Paragraph({
      text: '3. shared_db / tenant_db - Tenant Data',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `This schema is used for both shared_db (normal tenants) and tenant_db (enterprise tenants with dedicated databases). Contains ${SHARED_TENANT_DB_TABLES.length} tables.`, size: 22, font: 'Calibri' }),
      ],
      spacing: { after: 200 },
    }),
  ];
  for (const tableDef of SHARED_TENANT_DB_TABLES) {
    sharedDbChildren.push(...buildTableSection(tableDef));
  }

  sections.push({ children: [...titleChildren] });
  sections.push({ children: [...tocChildren, ...baseEntityChildren, ...adminDbChildren, ...sharedDbChildren] });

  const doc = new Document({
    creator: 'CargoEz',
    title: 'CargoEz - Database Schema Reference',
    description: 'Multi-Tenant SaaS Architecture - Database Schema Documentation',
    sections,
  });

  const buffer = await Packer.toBuffer(doc);
  const docxPath = path.join(DOCS_DIR, 'CargoEz-Database-Schema.docx');
  fs.writeFileSync(docxPath, buffer);
  console.log(`DOCX generated: ${docxPath}`);
}

// ─── XLSX GENERATION ────────────────────────────────────────────────────────────

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
};

const HEADER_FONT = { bold: true, size: 11, name: 'Calibri' };

function applyHeaderStyle(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function addTableRows(sheet, tableName, columns, dbLabel) {
  for (const col of BASE_ENTITY_COLUMNS) {
    sheet.addRow([
      tableName,
      col.name,
      col.type,
      col.nullable,
      col.default || '',
      col.constraints || '',
      col.description || '',
    ]);
  }
  for (const col of columns) {
    sheet.addRow([
      tableName,
      col.name,
      col.type,
      col.nullable,
      col.default || '',
      col.constraints || '',
      col.description || '',
    ]);
  }
}

async function generateXlsx() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CargoEz';
  workbook.created = new Date();

  // ── Summary sheet ──
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Database', key: 'database', width: 20 },
    { header: 'Table Count', key: 'tableCount', width: 15 },
    { header: 'Description', key: 'description', width: 60 },
  ];
  summarySheet.addRow({ database: 'admin_db', tableCount: 24, description: 'Central management database' });
  summarySheet.addRow({ database: 'shared_db', tableCount: 10, description: 'Shared tenant database for normal tenants' });
  summarySheet.addRow({ database: 'tenant_db', tableCount: 10, description: 'Dedicated database for enterprise tenants - same schema as shared_db' });
  applyHeaderStyle(summarySheet);

  // ── Base Entity sheet ──
  const baseSheet = workbook.addWorksheet('Base Entity');
  baseSheet.columns = [
    { header: 'Column Name', key: 'name', width: 20 },
    { header: 'Data Type', key: 'type', width: 15 },
    { header: 'Nullable', key: 'nullable', width: 10 },
    { header: 'Default', key: 'default', width: 15 },
    { header: 'Description', key: 'description', width: 40 },
  ];
  for (const col of BASE_ENTITY_COLUMNS) {
    baseSheet.addRow({
      name: col.name,
      type: col.type,
      nullable: col.nullable,
      default: col.default || '',
      description: col.description || '',
    });
  }
  applyHeaderStyle(baseSheet);

  // ── admin_db sheet ──
  const adminSheet = workbook.addWorksheet('admin_db');
  adminSheet.columns = [
    { header: 'Table Name', key: 'tableName', width: 35 },
    { header: 'Column Name', key: 'columnName', width: 25 },
    { header: 'Data Type', key: 'dataType', width: 18 },
    { header: 'Nullable', key: 'nullable', width: 10 },
    { header: 'Default', key: 'default', width: 18 },
    { header: 'Constraints', key: 'constraints', width: 40 },
    { header: 'Description', key: 'description', width: 35 },
  ];
  for (const tableDef of ADMIN_DB_TABLES) {
    addTableRows(adminSheet, tableDef.name, tableDef.columns);
  }
  applyHeaderStyle(adminSheet);

  // ── shared_db - tenant_db sheet ──
  const sharedSheet = workbook.addWorksheet('shared_db - tenant_db');
  sharedSheet.columns = [
    { header: 'Table Name', key: 'tableName', width: 35 },
    { header: 'Column Name', key: 'columnName', width: 25 },
    { header: 'Data Type', key: 'dataType', width: 18 },
    { header: 'Nullable', key: 'nullable', width: 10 },
    { header: 'Default', key: 'default', width: 18 },
    { header: 'Constraints', key: 'constraints', width: 40 },
    { header: 'Description', key: 'description', width: 35 },
  ];
  for (const tableDef of SHARED_TENANT_DB_TABLES) {
    addTableRows(sharedSheet, tableDef.name, tableDef.columns);
  }
  applyHeaderStyle(sharedSheet);

  const xlsxPath = path.join(DOCS_DIR, 'CargoEz-Database-Schema.xlsx');
  await workbook.xlsx.writeFile(xlsxPath);
  console.log(`XLSX generated: ${xlsxPath}`);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  console.log('Generating CargoEz Database Schema documentation...\n');
  await generateDocx();
  await generateXlsx();
  console.log('\nDone! Both files generated successfully.');
}

main().catch((err) => {
  console.error('Error generating schema docs:', err);
  process.exit(1);
});
