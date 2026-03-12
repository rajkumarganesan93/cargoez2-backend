import { Module } from '@nestjs/common';
import { TenantDatabaseModule } from '@cargoez/shared';
import { InternalController } from '../controllers/internal.controller';
import { ContextController } from '../controllers/context.controller';
import { ResolveContextUseCase } from '../../application/use-cases/resolve-context.use-case';

@Module({
  imports: [TenantDatabaseModule.forRoot()],
  controllers: [InternalController, ContextController],
  providers: [ResolveContextUseCase],
  exports: [ResolveContextUseCase],
})
export class InternalModule {}
