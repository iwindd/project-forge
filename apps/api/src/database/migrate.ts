import 'reflect-metadata';
import 'dotenv/config';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../../mikro-orm.config.js';

const orm = await MikroORM.init(config);
await orm.migrator.up();
await orm.close(true);
