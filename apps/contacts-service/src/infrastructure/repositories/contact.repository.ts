import { Injectable, Inject } from '@nestjs/common';
import { TenantBaseRepository } from '@cargoez/infrastructure';
import { getContextOrNull } from '@cargoez/domain';
import { TenantConnectionManager } from '@cargoez/shared';
import { ContactEntity } from '../../domain';

@Injectable()
export class ContactRepository extends TenantBaseRepository<ContactEntity> {
  constructor(
    @Inject('TENANT_CONNECTION_MANAGER') private readonly connMgr: TenantConnectionManager,
  ) {
    super(() => {
      const ctx = getContextOrNull();
      if (!ctx?.tenantUid || !ctx?.dbConnection) {
        throw new Error('No tenant context available for contacts query');
      }
      return connMgr.getConnection(ctx.tenantUid, ctx.dbConnection);
    }, 'contacts');
  }
}
