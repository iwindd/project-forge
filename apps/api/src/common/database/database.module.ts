import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UNIT_OF_WORK } from './unit-of-work.port.js';
import { MikroOrmUnitOfWork } from './mikro-orm.unit-of-work.js';
import { PersistenceModule } from './persistence.module.js';

@Module({
  imports: [
    ConfigModule,
    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        clientUrl: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        migrations: { path: './dist/src/database/migrations', pathTs: './src/database/migrations' },
      }),
    }),
    PersistenceModule,
  ],
  providers: [{ provide: UNIT_OF_WORK, useClass: MikroOrmUnitOfWork }],
  exports: [UNIT_OF_WORK, PersistenceModule],
})
export class DatabaseModule {}
