import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../auth/auth.module.js';
import { AccessController } from './access.controller.js';
import { AccessService } from './access.service.js';
import { AccessRequest } from './access-request.entity.js';
import { User } from '../users/user.entity.js';

@Module({
  imports: [AuthModule, MikroOrmModule.forFeature([AccessRequest, User])],
  controllers: [AccessController],
  providers: [AccessService],
})
export class AccessModule {}
