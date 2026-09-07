import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';

loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../../.env') });

const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api/v1');
app.use(cookieParser());
app.enableCors({
  origin: process.env.WEB_ORIGIN || 'http://localhost:3006',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID'],
});
await app.listen(Number(process.env.API_PORT || 3007), '0.0.0.0');
