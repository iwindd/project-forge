import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'project-forge-api', phase: 1, hermes: 'not-configured-in-phase-1' };
  }
}
