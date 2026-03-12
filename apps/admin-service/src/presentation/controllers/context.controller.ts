import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResolveContextUseCase } from '../../application/use-cases/resolve-context.use-case';

@ApiTags('Context')
@Controller('me')
export class ContextController {
  constructor(private readonly resolveContext: ResolveContextUseCase) {}

  @Get('context')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user context and permissions' })
  async getMyContext(@Req() request: any) {
    const user = request.user;
    const lookupKey = user?.sub || user?.email || user?.preferred_username;
    if (!lookupKey) {
      throw new UnauthorizedException('No authenticated user');
    }

    const ctx = await this.resolveContext.execute(lookupKey);

    const { dbConnection, ...publicContext } = ctx;
    return publicContext;
  }
}
