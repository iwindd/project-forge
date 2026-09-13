import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { DatabaseModule } from './common/database/database.module.js';
import { SecurityModule } from './common/security/security.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';
import { UsersModule } from './modules/users/users.module.js';

function importsOf(moduleClass: object): unknown[] {
  return Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleClass) ?? [];
}

describe('application module wiring', () => {
  it('exposes security logging to modules that use authentication guards', () => {
    expect(importsOf(AuditLogsModule)).toContain(SecurityModule);
    expect(importsOf(UsersModule)).toContain(SecurityModule);
  });

  it('exposes the unit of work to the profile module', () => {
    expect(importsOf(ProfileModule)).toContain(DatabaseModule);
  });
});
