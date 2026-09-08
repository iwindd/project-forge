import { Controller, Get } from '@nestjs/common';
import { HealthCheckUseCase } from '../application/health-check.use-case.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckUseCase) {}

  @Get()
  check() {
    return this.health.execute();
  }
}
