import { Controller, Get } from '@nestjs/common';
import { Public } from '@cargoez/infrastructure';

@Controller()
export class HealthController {
  @Get('health')
  @Public()
  health() {
    return { status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() };
  }
}
