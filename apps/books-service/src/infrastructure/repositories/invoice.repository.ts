import { Injectable, Inject } from '@nestjs/common';
import { TenantBaseRepository } from '@cargoez/infrastructure';
import { getContextOrNull } from '@cargoez/domain';
import { TenantConnectionManager } from '@cargoez/shared';
import { InvoiceEntity, InvoiceItemEntity } from '../../domain';

@Injectable()
export class InvoiceRepository extends TenantBaseRepository<InvoiceEntity> {
  constructor(
    @Inject('TENANT_CONNECTION_MANAGER') private readonly connMgr: TenantConnectionManager,
  ) {
    super(() => {
      const ctx = getContextOrNull();
      if (!ctx?.tenantUid || !ctx?.dbConnection) {
        throw new Error('No tenant context available for invoices query');
      }
      return connMgr.getConnection(ctx.tenantUid, ctx.dbConnection);
    }, 'invoices');
  }
}

@Injectable()
export class InvoiceItemRepository extends TenantBaseRepository<InvoiceItemEntity> {
  constructor(
    @Inject('TENANT_CONNECTION_MANAGER') private readonly connMgr: TenantConnectionManager,
  ) {
    super(() => {
      const ctx = getContextOrNull();
      if (!ctx?.tenantUid || !ctx?.dbConnection) {
        throw new Error('No tenant context available for invoice_items query');
      }
      return connMgr.getConnection(ctx.tenantUid, ctx.dbConnection);
    }, 'invoice_items');
  }

  async findByInvoiceUid(invoiceUid: string): Promise<InvoiceItemEntity[]> {
    let query = this.knex('invoice_items')
      .where('invoice_uid', invoiceUid)
      .where('is_active', true)
      .orderBy('sort_order', 'asc');
    query = this.applyTenantFilter(query);
    const rows = await query;
    return rows.map((r: any) => this.mapFromDb(r));
  }
}
