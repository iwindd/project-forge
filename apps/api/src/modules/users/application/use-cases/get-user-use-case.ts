import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { UserRecord } from '../../domain/user.js';
import { USER_REPOSITORY } from '../ports/user.repository.js';
import type { UserRepository } from '../ports/user.repository.js';

@Injectable()
export class GetUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(id: string): Promise<UserRecord> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User was not found');
    return user;
  }
}
