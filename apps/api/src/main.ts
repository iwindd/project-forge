import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { PublicErrorFilter } from './common/errors/public-error.filter.js';

loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../../.env') });

const app = await NestFactory.create(AppModule);
const config = app.get(ConfigService);
app.setGlobalPrefix('api/v1');
app.use(cookieParser());
const corsOrigins = [
  config.get<string>('WEB_ORIGIN') || 'http://localhost:3000',
  config.get<string>('ADMIN_ORIGIN') || 'http://localhost:5051',
];
app.enableCors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID', 'X-Organization-Id'],
});
app.useGlobalFilters(new PublicErrorFilter());
await app.listen(config.getOrThrow<number>('API_PORT'), '0.0.0.0');
