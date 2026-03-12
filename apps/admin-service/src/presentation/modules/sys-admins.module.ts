import { Module } from '@nestjs/common';
import { SysAdminRepository } from '../../infrastructure/repositories/sys-admin.repository';
import { SysAdminsController } from '../controllers/sys-admins.controller';

@Module({
  controllers: [SysAdminsController],
  providers: [SysAdminRepository],
  exports: [SysAdminRepository],
})
export class SysAdminsModule {}
