import { Controller, Get } from '@nestjs/common';
import { Public } from '@cargoez/infrastructure';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return { status: 'ok', service: 'contacts-service', timestamp: new Date().toISOString() };
  }
}
