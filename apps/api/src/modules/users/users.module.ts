import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../auth/auth.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User } from './user.entity.js';
import { Session } from '../auth/session.entity.js';

@Module({
  imports: [AuthModule, MikroOrmModule.forFeature([User, Session])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
