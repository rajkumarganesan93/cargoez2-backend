import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { RequirePermission } from '@cargoez/infrastructure';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  @Get('stats')
  @RequirePermission('tenants.read')
  @ApiOperation({ summary: 'Get dashboard summary statistics' })
  async getStats() {
    const [tenants, branches, appCustomers, sysAdmins, branchCustomers, products] =
      await Promise.all([
        this.knex('tenants').where('is_active', true).count('uid as count').first(),
        this.knex('branches').where('is_active', true).count('uid as count').first(),
        this.knex('app_customers').where('is_active', true).count('uid as count').first(),
        this.knex('sys_admins').where('is_active', true).count('uid as count').first(),
        this.knex('branch_customers').where('is_active', true).count('uid as count').first(),
        this.knex('products').where('is_active', true).count('uid as count').first(),
      ]);

    return createSuccessResponse(MessageCode.FETCHED, {
      tenants: Number(tenants?.count ?? 0),
      branches: Number(branches?.count ?? 0),
      appCustomers: Number(appCustomers?.count ?? 0),
      sysAdmins: Number(sysAdmins?.count ?? 0),
      branchCustomers: Number(branchCustomers?.count ?? 0),
      products: Number(products?.count ?? 0),
    });
  }
}
