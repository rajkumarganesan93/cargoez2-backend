import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { Public } from '@cargoez/infrastructure';
import { ResolveContextUseCase } from '../../application/use-cases/resolve-context.use-case';

@ApiTags('Internal')
@Controller('internal')
export class InternalController {
  constructor(private readonly resolveContext: ResolveContextUseCase) {}

  @Get('resolve-context')
  @Public()
  @ApiOperation({ summary: 'Resolve user context (internal use only)' })
  @ApiQuery({ name: 'keycloak_sub', required: true })
  async resolveUserContext(@Query('keycloak_sub') keycloakSub: string) {
    if (!keycloakSub) {
      throw new NotFoundException('keycloak_sub is required');
    }
    return this.resolveContext.execute(keycloakSub);
  }
}
