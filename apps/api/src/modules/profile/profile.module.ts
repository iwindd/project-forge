import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { SecurityModule } from '../../common/security/security.module.js';
import { AuditModule } from '../../common/audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ConnectionOrmEntity } from '../auth/infrastructure/persistence/connection.orm-entity.js';
import { ProfileConnectionRepository } from '../auth/infrastructure/persistence/profile-connection.repository.js';
import { UserOrmEntity } from '../users/infrastructure/persistence/user.orm-entity.js';
import { ProfileController } from './presentation/profile.controller.js';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule, MikroOrmModule.forFeature([UserOrmEntity, ConnectionOrmEntity]), SecurityModule],
  controllers: [ProfileController],
  providers: [ProfileConnectionRepository],
})
export class ProfileModule {}
