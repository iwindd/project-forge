import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditModule } from '../../common/audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { HermesRuntimeService } from './application/hermes-runtime.service.js';
import {
  HERMES_GATEWAY_FACTORY,
  HERMES_PROCESS_MANAGER,
  HERMES_RUNTIME_CONFIG,
  type HermesGatewayFactory,
  type HermesRuntimeConfig,
} from './domain/hermes-runtime.types.js';
import { HermesGatewayClient } from './infrastructure/hermes-gateway.client.js';
import { HermesProcessManager } from './infrastructure/hermes-process.manager.js';
import { HermesAgentsController } from './presentation/hermes-agents.controller.js';
import { HermesRuntimeController } from './presentation/hermes-runtime.controller.js';
import { ListSharedAgentsUseCase } from './application/use-cases/list-shared-agents-use-case.js';
import { GetSharedAgentOptionsUseCase } from './application/use-cases/get-shared-agent-options-use-case.js';
import { CreateSharedAgentUseCase } from './application/use-cases/create-shared-agent-use-case.js';

export function buildHermesRuntimeConfig(config: ConfigService): HermesRuntimeConfig {
  const configuredEndpoint = config.get<string>('HERMES_GATEWAY_URL')?.trim() || undefined;
  const host = config.get<string>('HERMES_GATEWAY_HOST') ?? '127.0.0.1';
  const port = config.get<number>('HERMES_GATEWAY_PORT') ?? 9119;
  const path = config.get<string>('HERMES_GATEWAY_PATH') ?? '/api/ws';
  const endpoint = configuredEndpoint ?? `ws://${host}:${port}${path}`;
  const parsed = new URL(endpoint);

  const parsedPort = Number(parsed.port) || (parsed.protocol === 'wss:' ? 443 : 80);

  return {
    command: config.get<string>('HERMES_COMMAND') ?? 'hermes',
    host: parsed.hostname || host,
    port: parsedPort,
    path: parsed.pathname || path,
    endpoint,
    endpointConfigured: configuredEndpoint !== undefined,
    token: config.get<string>('HERMES_GATEWAY_TOKEN'),
    autoStart: config.get<boolean>('HERMES_AUTOSTART') ?? true,
    isolated: config.get<boolean>('HERMES_ISOLATED') ?? true,
    connectTimeoutMs: config.get<number>('HERMES_CONNECT_TIMEOUT_MS') ?? 10_000,
    startTimeoutMs: config.get<number>('HERMES_START_TIMEOUT_MS') ?? 15_000,
  };
}

const gatewayFactory: HermesGatewayFactory = ({ endpoint, token, connectTimeoutMs }) =>
  new HermesGatewayClient(endpoint, token, connectTimeoutMs);

@Module({
  imports: [ConfigModule, AuthModule, AuditModule],
  controllers: [HermesRuntimeController, HermesAgentsController],
  providers: [
    {
      provide: HERMES_RUNTIME_CONFIG,
      inject: [ConfigService],
      useFactory: buildHermesRuntimeConfig,
    },
    {
      provide: HERMES_PROCESS_MANAGER,
      inject: [HERMES_RUNTIME_CONFIG],
      useFactory: (runtimeConfig: HermesRuntimeConfig) => new HermesProcessManager(runtimeConfig),
    },
    {
      provide: HERMES_GATEWAY_FACTORY,
      useValue: gatewayFactory,
    },
    HermesRuntimeService,
    ListSharedAgentsUseCase,
    GetSharedAgentOptionsUseCase,
    CreateSharedAgentUseCase,
  ],
  exports: [HermesRuntimeService],
})
export class HermesRuntimeModule {}
