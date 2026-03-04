import { Controller, Get } from '@nestjs/common';
import { Public } from '@cargoez/infrastructure';

@Controller()
export class HealthController {
  @Get('health')
  @Public()
  health() {
    return { status: 'ok', service: 'shared-db-example', timestamp: new Date().toISOString() };
  }
}
