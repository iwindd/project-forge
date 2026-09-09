import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthCheckUseCase {
  execute() {
    return {
      status: 'ok',
      service: 'project-forge-api',
      phase: 1,
      hermes: 'not-configured-in-phase-1',
    };
  }
}
