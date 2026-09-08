import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { SECURITY_LOGGER } from './security-log.port.js';
import { MikroOrmSecurityAdapter } from './mikro-orm-security.adapter.js';
import { UserSecurityLogOrmEntity } from './user-security-log.orm-entity.js';

@Module({
  imports: [MikroOrmModule.forFeature([UserSecurityLogOrmEntity])],
  providers: [{ provide: SECURITY_LOGGER, useClass: MikroOrmSecurityAdapter }],
  exports: [SECURITY_LOGGER],
})
export class SecurityModule {}
