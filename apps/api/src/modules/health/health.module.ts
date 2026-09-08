import { Module } from '@nestjs/common';
import { HealthCheckUseCase } from './application/health-check.use-case.js';
import { HealthController } from './presentation/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [HealthCheckUseCase],
})
export class HealthModule {}
