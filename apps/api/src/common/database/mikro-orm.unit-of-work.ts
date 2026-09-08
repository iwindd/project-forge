import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { UnitOfWork } from './unit-of-work.port.js';

@Injectable()
export class MikroOrmUnitOfWork implements UnitOfWork {
  constructor(private readonly em: EntityManager) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.em.transactional(() => work());
  }
}
